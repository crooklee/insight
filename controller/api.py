import json
import tornado.web

cl = []


class LocationListHandler(tornado.web.RequestHandler):

    '''
    {"lng":120.645,"lat":31.144,"count":100},
    {"lng":120.656,"lat":31.154,"count":75},
    {"lng":120.650,"lat":31.144,"count":50},
    {"lng":120.658,"lat":31.134,"count":25}];
    '''
    @tornado.web.asynchronous
    def get(self, *args):
        self.finish()
        data = {"lng": 120.645, "lat": 31.144, "count": 100}
        data = json.dumps(data)
        for c in cl:
            c.write_message(data)

    @tornado.web.asynchronous
    def post(self):

        pass


class LocationDetailHandler(tornado.web.RequestHandler):

    '''
    {"lng":120.645,"lat":31.144,"count":100},
    {"lng":120.656,"lat":31.154,"count":75},
    {"lng":120.650,"lat":31.144,"count":50},
    {"lng":120.658,"lat":31.134,"count":25}];
    '''
    @tornado.web.asynchronous
    def get(self, *args):
        self.finish()
        # id = self.get_argument("id")
        # value = self.get_argument("value")
        data = {"lng": 120.645, "lat": 31.144, "count": 100}
        data = json.dumps(data)
        for c in cl:
            c.write_message(data)

    @tornado.web.asynchronous
    def post(self):

        pass
