from flask import Flask, jsonify, render_template, request
from flask_bootstrap import Bootstrap

from werkzeug.utils import secure_filename
import madmom
import os

ALLOWED_EXTENSIONS = {'wav'}
UPLOAD_FOLDER = '.'
app = Flask(__name__)
Bootstrap(app)

app.config['MAX_CONTENT_LENGTH'] = 16 * 1000 * 1000

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/v1/upload', methods=['POST', 'GET'])
def api_testforflask():
    if request.method == 'POST':
        file = request.files['audio_data']
        bpm = float(request.form.get('setBPM'))
        fn = secure_filename('test.wav')
        file.save(os.path.join(UPLOAD_FOLDER, fn))

        proc_tempo = madmom.features.tempo.TempoEstimationProcessor(fps=100, max_bpm= int(bpm * 1.1), min_bpm=int(bpm * 0.95))
        proc = madmom.features.beats.BeatTrackingProcessor(fps=100, look_aside=0.9, tempo_estimator=proc_tempo)
        act = madmom.features.beats.RNNBeatProcessor()(os.path.join(UPLOAD_FOLDER, fn))
        beat_times = proc(act)

        return jsonify(beat_times.tolist())

@app.route("/", methods=["GET"])
def index():
    return render_template('metronome.html')

if __name__ == "__main__":
    app.run(debug=True, threaded=True, host='127.0.0.1', port=8080)