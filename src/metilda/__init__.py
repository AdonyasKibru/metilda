# Enable headless matplotlib
import matplotlib

from metilda.models.uploads import MetildaUploadCrud

matplotlib.use('Agg')

from flask import Flask, render_template
import os
import ZODB

# Initialize database
db = ZODB.DB(None)
with db.transaction() as conn:
    conn.root.upload_crud = MetildaUploadCrud()

app = Flask(__name__,
            static_folder="../../frontend/build/static",
            template_folder="../../frontend/build")
app.config["UPLOAD_FOLDER"] = "../uploads"

import metilda.controllers.pitch_art_wizard

@app.route('/')
def homepage():
    return render_template("index.html")


def get_app():
    if not os.path.exists(app.config["UPLOAD_FOLDER"]):
        os.mkdir(app.config["UPLOAD_FOLDER"])
    return app