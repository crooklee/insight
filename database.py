from sqlalchemy import create_engine
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from models import User

engine = create_engine(
    'sqlite:///./insight.db', convert_unicode=True, echo=True)
db_session = scoped_session(sessionmaker(autocommit=False,
                                         autoflush=False,
                                         bind=engine))
Base = declarative_base()
Base.query = db_session.query_property()


def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == '__main__':
    init_db()
    ed_user = User(name='ed', fullname='Ed Jones', password='password')
    db_session.add(ed_user)
    db_session.commit()
    our_user = db_session.query(User).filter_by(name='ed').first()
    print our_user.fullname
