# Python imports
import os
import concurrent.futures
import bcrypt
import json
# Tornado imports
import tornado.auth
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web


from tornado.options import define, options
from tornado.web import url
from tornado import gen, websocket
# Sqlalchemy imports
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

# App imports
import forms
import models
import uimodules
executor = concurrent.futures.ThreadPoolExecutor(2)
# Options
define("port", default=8888, help="run on the given port", type=int)
define("debug", default=True, type=bool)
define("db_path", default='sqlite:///./insight.db', type=str)


class Application(tornado.web.Application):

    def __init__(self):
        handlers = [
            url(r"/", IndexHandler, name='index'),
            url(r"/auth/create", AuthCreateHandler),
            url(r"/auth/login", AuthLoginHandler),
            url(r"/auth/logout", AuthLogoutHandler),
            url(r'/ws', SocketHandler),
            url(r'/api', ApiHandler),
        ]
        settings = dict(
            debug=options.debug,
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            template_path=os.path.join(os.path.dirname(__file__), 'templates'),
            xsrf_cookies=True,
            # TODO Change this to a random string
            cookie_secret="nzjxcjasduuqwheazmu=",
            ui_modules=uimodules,
            login_url="/auth/login",
        )
        tornado.web.Application.__init__(self, handlers, **settings)
        engine = create_engine(
            options.db_path, convert_unicode=True, echo=options.debug)
        models.init_db(engine)
        self.db = scoped_session(sessionmaker(bind=engine))


class BaseHandler(tornado.web.RequestHandler):

    @property
    def db(self):
        return self.application.db

    def get_current_user(self):
        name = self.get_secure_cookie("platform_user")
        if not name:
            return None
        return self.db.query(models.User).filter_by(name=name).first()

    def any_user_exists(self):
        print self.db.query(models.User).first()
        return bool(self.db.query(models.User).first())


class IndexHandler(BaseHandler):

    @tornado.web.authenticated
    def get(self):
        # form = forms.HelloForm()
        users = self.db.query(models.User).order_by(models.User.id)
        self.render('index.html', users=users)

    def post(self):
        form = forms.HelloForm(self)
        if form.validate():
            self.write('Hello %s' % form.planet.data)
        else:
            self.render('index.html', form=form)


class AuthCreateHandler(BaseHandler):

    def get(self):
        if self.any_user_exists():
            self.redirect("/auth/login")
        else:
            self.render("create_user.html")

    @gen.coroutine
    def post(self):
        if self.any_user_exists():
            raise tornado.web.HTTPError(400, "user already created")
        hashed_password = yield executor.submit(
            bcrypt.hashpw, tornado.escape.utf8(self.get_argument("password")),
            bcrypt.gensalt())

        ed_user = models.User(name=self.get_argument("name"),
                              password=hashed_password)
        self.db.add(ed_user)
        self.db.commit()
        self.set_secure_cookie("platform_user", str(ed_user.name))
        self.redirect(self.get_argument("next", "/"))


class AuthLoginHandler(BaseHandler):

    def get(self):
        # If there are no authors, redirect to the account creation page.
        if not self.any_user_exists():
            self.redirect("/auth/create")
        else:
            self.render("login.html", error=None)

    @gen.coroutine
    def post(self):
        username = self.get_argument("name")
        user = self.db.query(models.User).filter_by(name=username).first()
        if not user:
            self.render("login.html", error="user not found")
            return
        hashed_password = yield executor.submit(
            bcrypt.hashpw, tornado.escape.utf8(self.get_argument("password")),
            tornado.escape.utf8(user.password))
        if hashed_password == user.password:
            self.set_secure_cookie("platform_user", str(user.name))
            self.redirect(self.get_argument("next", "/"))
        else:
            self.render("login.html", error="incorrect password")


class AuthLogoutHandler(BaseHandler):

    def get(self):
        self.clear_cookie("platform_user")
        self.redirect(self.get_argument("next", "/"))
# Write your handlers here

cl = []


class SocketHandler(websocket.WebSocketHandler):

    def check_origin(self, origin):
        return True

    def open(self):
        if self not in cl:
            cl.append(self)

    def on_close(self):
        if self in cl:
            cl.remove(self)


class ApiHandler(tornado.web.RequestHandler):

    @tornado.web.asynchronous
    def get(self, *args):
        self.finish()
        id = self.get_argument("id")
        value = self.get_argument("value")
        data = {"id": id, "value": value}
        data = json.dumps(data)
        for c in cl:
            c.write_message(data)

    @tornado.web.asynchronous
    def post(self):
        pass


def main():
    tornado.options.parse_command_line()
    http_server = tornado.httpserver.HTTPServer(Application())
    http_server.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == '__main__':
    main()
