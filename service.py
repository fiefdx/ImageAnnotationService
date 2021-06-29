# -*- coding: utf-8 -*-

import os
import sys
import signal
import logging

import tornado.ioloop
import tornado.httpserver
import tornado.web
from litepipeline_helper.models.action import Action

from handlers import info
from utils import common
import logger
from config import CONFIG

LOG = logging.getLogger(__name__)

cwd = os.path.split(os.path.realpath(__file__))[0]


class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", info.HomeHandler),
        ]
        settings = dict(
            debug = False,
            template_path = os.path.join(cwd, "templates"),
            static_path = os.path.join(cwd, "static")
        )
        tornado.web.Application.__init__(self, handlers, **settings)


if __name__ == "__main__":
    workspace, input_data = Action.get_input()

    logs_directory = os.path.join(workspace, "logs")
    logger.config_logging(file_name = "service.log",
                          log_level = "DEBUG",
                          dir_name = logs_directory,
                          day_rotate = False,
                          when = "D",
                          interval = 1,
                          max_size = 20,
                          backup_count = 5,
                          console = False)
    LOG.debug("service start")
    LOG.debug("input_data: %s", input_data)

    data = {}
    try:
        CONFIG["data_path"] = workspace
        CONFIG["http_host"] = input_data["http_host"]
        CONFIG["http_port"] = input_data["http_port"]
        http_server = tornado.httpserver.HTTPServer(
            Application(),
            max_buffer_size = CONFIG["max_buffer_size"],
            chunk_size = 10 * 1024 * 1024
        )
        http_server.listen(CONFIG["http_port"], address = CONFIG["http_host"])
        # http_server.bind(CONFIG["http_port"], address = CONFIG["http_host"])
        common.Servers.HTTP_SERVER = http_server
        signal.signal(signal.SIGTERM, common.sig_handler)
        signal.signal(signal.SIGINT, common.sig_handler)
        tornado.ioloop.IOLoop.instance().start()
        for t in common.Servers.THREADS:
            t.join()
    except Exception as e:
        LOG.exception(e)

    Action.set_output(data = data)
    LOG.debug("service end")
