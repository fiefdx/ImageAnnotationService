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
        "HostNotExists": {"name": "HostNotExists", "message": "host not exists"},
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


def init_storage():
    directories = [
        os.path.join(CONFIG["data_path"], "tmp"),
    ]
    for d in directories:
        if not os.path.exists(d) or not os.path.isdir(d):
            os.makedirs(d)
