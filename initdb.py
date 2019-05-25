from tutorifull import app
from flask_sqlalchemy import SQLAlchemy
    
def init_db():
    import models  # NOQA (ignore unused import error)
    
    #Base.metadata.create_all(engine)
    db = SQLAlchemy()
    db.init_app(app)
    with app.app_context():
      db.create_all()
    print('test')
    
init_db()