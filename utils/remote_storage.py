# -*- coding: utf-8 -*-

import os
import time
import json
import logging
import datetime
import zipfile

from litedfs_client.client import LiteDFSClient
from utils.common import joinpath, splitpath, listsort, sha1sum
from config import CONFIG

LOG = logging.getLogger(__name__)


class RemoteStorage(object):
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.client = LiteDFSClient(self.host, self.port)

    def listdir(self, dir_path, sort_by = "name", desc = False, offset = 0, limit = -1, only_files = False):
        dirs = []
        files = []
        try:
            r = self.client.list_directory(dir_path)
            if r:
                if "result" in r and r["result"] == "ok":
                    n = 1
                    for c in r["children"]:
                        if c["type"] == "directory":
                            if only_files:
                                continue
                            d_path = os.path.join(dir_path, c["name"])
                            dirs.append({
                                "num": n,
                                "name": c["name"],
                                "sha1": sha1sum(d_path),
                                "type": "Directory",
                                "size": c["size"],
                                "ctime": "",
                                "mtime": ""
                            })
                        elif c["type"] == "file":
                            f_path = os.path.join(dir_path, c["name"])
                            f = {
                                "num": n,
                                "name": c["name"],
                                "sha1": sha1sum(f_path),
                                "type": os.path.splitext(c["name"])[-1],
                                "size": c["size"],
                                "ctime": "",
                                "mtime": ""
                            }
                            if "current_replica" in c:
                                f["current_replica"] = c["current_replica"]
                            if "replica" in c:
                                f["replica"] = c["replica"]
                            files.append(f)
                        n += 1
                    items, total = listsort(dirs, files, sort_by = sort_by, desc = desc, offset = offset, limit = limit)
        except Exception as e:
            LOG.exception(e)
        return items, total

    def listzip(self, zip_file_path, sort_by = "name", desc = False, offset = 0, limit = -1, only_files = False):
        dirs = []
        files = []
        try:
            rf = self.open_remote_file(zip_file_path)
            z = zipfile.ZipFile(rf)
            files_info = z.infolist()
            n = 1
            for f in files_info:
                if f.is_dir():
                    if only_files:
                        continue
                    d_path = f.filename
                    dirs.append({
                        "num": n,
                        "name": f.filename,
                        "sha1": sha1sum(d_path),
                        "type": "Directory",
                        "size": f.file_size,
                        "ctime": "",
                        "mtime": ""
                    })
                else:
                    f_path = f.filename
                    files.append({
                        "num": n,
                        "name": f.filename,
                        "sha1": sha1sum(f_path),
                        "type": os.path.splitext(f.filename)[-1],
                        "size": f.file_size,
                        "ctime": "",
                        "mtime": ""
                    })
                n += 1
            items, total = listsort(dirs, files, sort_by = sort_by, desc = desc, offset = offset, limit = limit)
        except Exception as e:
            LOG.exception(e)
        return items, total

    def list_storage(self, home_path, dir_path, sort_by = "name", desc = False, offset = 0, limit = -1):
        data = {}
        try:
            r = self.client.list_directory(dir_path)
            if r:
                if "result" in r and r["result"] == "ok":
                    dirs = []
                    files = []
                    n = 1
                    for c in r["children"]:
                        if c["type"] == "directory":
                            d_path = os.path.join(dir_path, c["name"])
                            dirs.append({
                                "num": n,
                                "name": c["name"],
                                "sha1": sha1sum(d_path),
                                "type": "Directory",
                                "size": c["size"],
                                "ctime": datetime.datetime.fromtimestamp(c["ctime"]).strftime("%Y-%m-%d %H:%M:%S") if "ctime" in c and c["ctime"] else "",
                                "mtime": datetime.datetime.fromtimestamp(c["mtime"]).strftime("%Y-%m-%d %H:%M:%S") if "mtime" in c and c["mtime"] else ""
                            })
                        elif c["type"] == "file":
                            f_path = os.path.join(dir_path, c["name"])
                            f = {
                                "num": n,
                                "name": c["name"],
                                "sha1": sha1sum(f_path),
                                "type": os.path.splitext(c["name"])[-1],
                                "size": c["size"],
                                "ctime": datetime.datetime.fromtimestamp(c["ctime"]).strftime("%Y-%m-%d %H:%M:%S") if "ctime" in c and c["ctime"] else "",
                                "mtime": datetime.datetime.fromtimestamp(c["mtime"]).strftime("%Y-%m-%d %H:%M:%S") if "mtime" in c and c["mtime"] else ""
                            }
                            if "current_replica" in c:
                                f["current_replica"] = c["current_replica"]
                            if "replica" in c:
                                f["replica"] = c["replica"]
                            files.append(f)
                        n += 1
                    items, total = listsort(dirs, files, sort_by = sort_by, desc = desc, offset = offset, limit = limit)
                    data["items"] = items
                    data["offset"] = offset
                    data["limit"] = limit
                    data["total"] = total
                    data["sort"] = {"name": sort_by, "desc": desc}
                    data["dir_path"] = splitpath(dir_path)
                    data["home_path"] = splitpath(home_path)
                    data["home_path_string"] = home_path
        except Exception as e:
            LOG.exception(e)
        return data

    def rename(self, dir_path, new_name):
        result = False
        try:
            result = self.client.rename_file(dir_path, new_name)
        except Exception as e:
            LOG.exception(e)
        return result

    def mkdir(self, dir_path):
        result = False
        try:
            result = self.client.create_directory(dir_path)
        except Exception as e:
            LOG.exception(e)
        return result

    def delete_file(self, file_path):
        result = False
        try:
            result = self.client.delete_file(file_path)
        except Exception as e:
            LOG.exception(e)
        return result

    def delete_directory(self, dir_path):
        result = False
        try:
            result = self.client.delete_directory(dir_path)
        except Exception as e:
            LOG.exception(e)
        return result

    def move_file(self, source_path, target_path):
        result = False
        try:
            result = self.client.move_file(source_path, target_path)
        except Exception as e:
            LOG.exception(e)
        return result

    def move_directory(self, source_path, target_path):
        result = False
        try:
            result = self.client.move_directory(source_path, target_path)
        except Exception as e:
            LOG.exception(e)
        return result

    def download_file(self, source_path, target_path):
        result = False
        try:
            result = self.client.download_file(source_path, target_path)
        except Exception as e:
            LOG.exception(e)
        return result

    def upload_file(self, source_path, target_path, replica = 1):
        result = False
        try:
            result = self.client.create_file(source_path, target_path, replica = replica)
        except Exception as e:
            LOG.exception(e)
        return result

    def upload_file_by_content(self, content, target_path, replica = 1):
        result = False
        try:
            result = self.client.create_file_by_content(content, target_path, replica = replica)
        except Exception as e:
            LOG.exception(e)
        return result

    def update_file(self, file_path, replica = 1):
        result = False
        try:
            result = self.client.update_file(file_path, replica)
        except Exception as e:
            LOG.exception(e)
        return result

    def preview_zip_file(self, file_path):
        result = False
        try:
            fp = self.client.open_remote_file(file_path)
            if fp:
                z = zipfile.ZipFile(fp)
                result = z.namelist()
        except Exception as e:
            LOG.exception(e)
        return result

    def preview_text_file(self, file_path):
        result = False
        try:
            fp = self.client.open_remote_file(file_path)
            if fp:
                result = fp.read().decode()
        except Exception as e:
            LOG.exception(e)
        return result

    def read_file(self, file_path):
        result = False
        try:
            fp = self.client.open_remote_file(file_path)
            if fp:
                result = fp.read()
        except Exception as e:
            LOG.exception(e)
        return result

    def read_zip_file(self, zip_file_path, file_path):
        result = False
        try:
            fp = self.client.open_remote_file(zip_file_path)
            if fp:
                z = zipfile.ZipFile(fp)
                file = z.open(file_path)
                result = file.read()
        except Exception as e:
            LOG.exception(e)
        return result

    def exists_file(self, file_path):
        result = False
        try:
            result = self.client.info_file(file_path)
        except Exception as e:
            LOG.exception(e)
        return result

    def open_remote_file(self, file_path):
        return self.client.open_remote_file(file_path)
