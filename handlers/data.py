# -*- coding: utf-8 -*-

import os
import urllib
import logging

from tornado import gen

from handlers.base import BaseWebHandler, BaseHandler, BaseSocketHandler
from utils.remote_storage import RemoteStorage
from utils.common import Errors
from config import CONFIG

LOG = logging.getLogger("__name__")


class ListFilesHandler(BaseHandler):
    @gen.coroutine
    def get(self):
        result = {"result": Errors.OK}
        try:
            storage = self.get_argument("storage", "")
            offset = int(self.get_argument("offset", 0))
            limit = int(self.get_argument("limit", 0))
            sort_by = self.get_argument("sort_by", "name")
            sort_order = self.get_argument("sort_order", "asc")
            if storage:
                u = urllib.parse.urlparse(storage)
                dir_path = u.path
                host = u.hostname
                port = u.port
                scheme = u.scheme
                if dir_path and host and port:
                    if scheme.lower() == "ldfs":
                        c = RemoteStorage(host, port)
                        files, total = c.listdir(dir_path, sort_by = sort_by, desc = True if sort_order == "desc" else False, offset = offset, limit = limit, only_files = True)
                        result["path"] = dir_path
                        result["files"] = files
                        result["offset"] = offset
                        result["limit"] = limit
                        result["total"] = total
                    else:
                        Errors.set_result_error("InvalidParameters", result)
                else:
                    Errors.set_result_error("InvalidParameters", result)
            else:
                Errors.set_result_error("InvalidParameters", result)
        except InvalidValueError as e:
            LOG.error(e)
            Errors.set_result_error("InvalidParameters", result)
        except Exception as e:
            LOG.exception(e)
            Errors.set_result_error("ServerException", result)
        self.write(result)
        self.finish()


class FileHandler(BaseHandler):
    @gen.coroutine
    def get(self):
        result = {"result": Errors.OK}
        try:
            storage = self.get_argument("storage", "")
            number = int(self.get_argument("number", 0))
            sort_by = self.get_argument("sort_by", "name")
            sort_order = self.get_argument("sort_order", "asc")
            info = False if self.get_argument("info", "false") == "false" else True
            if storage:
                u = urllib.parse.urlparse(storage)
                dir_path = u.path
                host = u.hostname
                port = u.port
                scheme = u.scheme
                if dir_path and host and port and number > 0:
                    if scheme.lower() == "ldfs":
                        c = RemoteStorage(host, port)
                        files, total = c.listdir(dir_path, sort_by = sort_by, desc = True if sort_order == "desc" else False, offset = number - 1, limit = 1, only_files = True)
                        file = files[0]
                        if info:
                            result["file"] = file
                            result["file_path"] = os.path.join(dir_path, file["name"])
                        else:
                            content = c.read_file(os.path.join(dir_path, file["name"]))
                            if content:
                                self.set_header('Content-Type', 'image/jpeg')
                                self.set_header('Content-Disposition', 'attachment; filename=%s' % file["name"])
                                self.set_header('File-Name', file["name"])
                                self.set_header('File-Size', file["size"])
                                self.set_header('File-Path', os.path.join(dir_path, file["name"]))
                                self.write(content)
                                self.flush()
                                return
                            else:
                                Errors.set_result_error("OperationFailed", result)
                    else:
                        Errors.set_result_error("InvalidParameters", result)
                else:
                    Errors.set_result_error("InvalidParameters", result)
            else:
                Errors.set_result_error("InvalidParameters", result)
        except InvalidValueError as e:
            LOG.error(e)
            Errors.set_result_error("InvalidParameters", result)
        except Exception as e:
            LOG.exception(e)
            Errors.set_result_error("ServerException", result)
        self.write(result)
        self.finish()
