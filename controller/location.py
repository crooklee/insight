class LocationHandler(BaseHandler):

    @tornado.web.authenticated
    def get(self):
        user = self.get_current_user()
        locations = self.db.query(models.Location).all()
        self.render('location.html', user=user, locations=locations)


class LocationSetupHandler(BaseHandler):

    @tornado.web.authenticated
    def post(self):
        name = self.get_argument("name")
        id = self.get_argument("id")
        lng = self.get_argument("lng")
        lat = self.get_argument("lat")
        location = self.db.query(models.Location).filter_by(id=id).first()
        location.name = name
        location.lng = lng
        location.lat = lat
        self.db.commit()
        self.write('success')


class LocationRemoveHandler(BaseHandler):
    @tornado.web.authenticated
    def post(self):
        id = self.get_argument("id")
        location = self.db.query(models.Location).filter_by(id=id).one()
        self.db.delete(location)
        self.write('success')


class LocationAddHandler(BaseHandler):

    @tornado.web.authenticated
    def post(self):
        name = self.get_argument("name")
        lng = self.get_argument("lng")
        lat = self.get_argument("lat")
        location = models.Location(name=name,
                                   lng=lng,
                                   lat=lat)
        self.db.add(location)
        self.db.commit()
        print name, lng, lat
        self.write('success')