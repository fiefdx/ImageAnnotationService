# -*- coding: utf-8 -*-

import os
import time
import json
import hashlib
import logging
import datetime

from tornado import ioloop
from tornado import gen

from config import CONFIG

LOG = logging.getLogger(__name__)

BUF_SIZE = 65536


class Servers(object):
    HTTP_SERVER = None
    DB_SERVERS = []
    THREADS = []
    CONFIG = None
    TORNADO_INSTANCE = None


async def shutdown():
    LOG.info("Stopping Service(%s:%s)", CONFIG["http_host"], CONFIG["http_port"])
    if Servers.HTTP_SERVER:
        Servers.HTTP_SERVER.stop()
        LOG.info("Stop http server!")
    for db_server in Servers.DB_SERVERS:
        db_server.close()
        LOG.info("Stop db server!")
    for t in Servers.THREADS:
        t.stop()
        LOG.info("Stop thread!")
    await gen.sleep(1)
    LOG.info("Will shutdown ...")
    ioloop.IOLoop.current().stop()


def sig_handler(sig, frame):
    LOG.warning("sig_handler Caught signal: %s", sig)
    ioloop.IOLoop.current().add_callback_from_signal(shutdown)


class Errors(object):
    OK = "ok"
    errors = {
        "ServerException": {"name": "ServerException", "message": "server exception"},
        "InvalidParameters": {"name": "InvalidParameters", "message": "invalid parameters"},
        "OperationFailed": {"name": "OperationFailed", "message": "operation failed"},
        "FileNotExists": {"name": "FileNotExists", "message": "file not exists"},
    }

    @classmethod
    def set_result_error(cls, error_name, result, message = ""):
        if error_name in cls.errors:
            result["result"] = error_name
            if message == "":
                result["message"] = cls.errors[error_name]["message"]
            else:
                result["message"] = message
        else:
            result["result"] = "UnknownError"
            result["message"] = "unknown error"


class Stage(object):
    pending = "pending"
    running = "running"
    finished = "finished"
    stopping = "stopping"
    recovering = "recovering"


class Status(object):
    fail = "fail"
    success = "success"
    kill = "kill"
    cancel = "cancel"
    terminate = "terminate"
    error = "error"


class JSONLoadError(Exception):
    def __init__(self, message):
        self.message = message


class MetaNotDictError(Exception):
    def __init__(self, message):
        self.message = message


class InvalidValueError(Exception):
    def __init__(self, message):
        self.message = message


def sha1sum(content):
    sha1 = hashlib.sha1()
    sha1.update(content.encode("utf-8"))
    return sha1.hexdigest()


def file_sha1sum(file_path):
    sha1 = hashlib.sha1()
    with open(file_path, 'rb') as f:
        while True:
            data = f.read(BUF_SIZE)
            if not data:
                break
            sha1.update(data)
    return sha1.hexdigest()


def file_md5sum(file_path):
    md5 = hashlib.md5()
    with open(file_path, 'rb') as fp:
        while True:
            data = fp.read(BUF_SIZE)
            if not data:
                break
            md5.update(data)
    return md5.hexdigest()


def get_file_size(size):
    result = ""
    try:
        if size > 1024*1014*1024:
            result = "%.3f G"%(size/1024.0/1024.0/1024.0)
        elif size > 1024*1024:
            result = "%.3f M"%(size/1024.0/1024.0)
        elif size > 1024:
            result = "%.3f K"%(size/1024.0)
        else:
            result = "%d B"%size
    except Exception as e:
        LOG.exception(e)
        result = "0 B"
    return result


def makekey(c):
    if isinstance(c, int):
        return c
    elif isinstance(c, str):
        return c.lower()


def listsort(dirs, files, sort_by = "name", desc = False, offset = 0, limit = -1):
    dirs_keys = []
    dirs_tree = {}
    dirs_sort = []
    files_keys = []
    files_tree = {}
    files_sort = []
    result = []
    for d in dirs:
        dirs_keys.append(d[sort_by])
        if d[sort_by] in dirs_tree:
            dirs_tree[d[sort_by]].append(d)
        else:
            dirs_tree[d[sort_by]] = []
            dirs_tree[d[sort_by]].append(d)
    dirs_keys = list(set(dirs_keys))
    dirs_keys.sort(key = makekey, reverse = desc)
    # LOG.info("Dirs_keys: %s", dirs_keys)
    n = 1
    for k in dirs_keys:
        for d in dirs_tree[k]:
            d["num"] = n
            d["size"] = get_file_size(d["size"])
            dirs_sort.append(d)
            n += 1
    for f in files:
        files_keys.append(f[sort_by])
        if f[sort_by] in files_tree:
            files_tree[f[sort_by]].append(f)
        else:
            files_tree[f[sort_by]] = []
            files_tree[f[sort_by]].append(f)
    files_keys = list(set(files_keys))
    files_keys.sort(key = makekey, reverse = desc)
    # LOG.info("Files_keys: %s", files_keys)
    for k in files_keys:
        for f in files_tree[k]:
            f["num"] = n
            f["size"] = get_file_size(f["size"])
            files_sort.append(f)
            n += 1
    items = []
    items.extend(dirs_sort)
    items.extend(files_sort)
    total_len = len(items)
    if limit == -1:
        result = items
    else:
        result = items[offset:offset + limit]

    return (result, total_len)


def joinpath(dir_list):
    dir_path = dir_list[0]
    dir_list = dir_list[1:]
    for d in dir_list:
        dir_path = os.path.join(dir_path, d)
    return dir_path


def splitpath(dir_path):
    dir_list = []
    dir_path, dir_last = os.path.split(dir_path)
    while dir_last != "":
        dir_list.append(dir_last)
        dir_path, dir_last = os.path.split(dir_path)
    dir_list.append(dir_path)
    dir_list.reverse()
    return dir_list


def init_storage():
    directories = [
        os.path.join(CONFIG["data_path"], "tmp"),
    ]
    for d in directories:
        if not os.path.exists(d) or not os.path.isdir(d):
            os.makedirs(d)
