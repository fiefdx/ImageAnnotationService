# -*- coding: utf-8 -*-

import logging

from tornado import gen

from handlers.base import BaseWebHandler, BaseHandler, BaseSocketHandler
from config import CONFIG

LOG = logging.getLogger("__name__")


class AboutHandler(BaseHandler):
    @gen.coroutine
    def get(self):
        result = {"message": "image annotation service"}
        self.write(result)
        self.finish()


class HomeHandler(BaseWebHandler):
    @gen.coroutine
    def get(self):
        self.render(
            "images/images.html",
            current_nav = "images"
        )