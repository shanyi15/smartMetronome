# smartMetronome 🎵
## Introduction
This demo uses flask, librosa, madmom, HTML/CSS/JavaScript to create a smart metronome app, targeting for musical instrument players who would like to record their performance and get a report with beat analysis.
It's from Yi Shan's thesis project at NYU Music Tech Program.

## How to run
* install virtualenv
```
pip install virtualenv
```

* Activate env, run the following command
```
source ./bin/activate
```

* Install Python libs
```
pip install -r requirement.txt
```

* Run
```
python app.py
# Or, python3 app.py, depends on which python you are using.
```

If you start the server successfully, you will see the address in terminal.
The default address should be: http://127.0.0.1:8080/ .

You can change host or port by editing `app.py`.

## Usage
* Allow the mic authentication for the first time.
* Click `Start` button to start the metronome, the recorder will start at the same time.
* Playing some music 🎶
* Click `Stop`.
* You will see your recording showing at the right side of the website.
* Playback, or interact with the wave. If you are satisfied with it, click "Analyse".
* Loading... and then, you will see your report at the bottom!

## Please note
* For now, there is always a delay after the recorder start. To avoid this temporarily, let the metronome tick for several seconds, then start playing.
* Any questions, please leave an issue.