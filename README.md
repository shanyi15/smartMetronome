# smartMetronome 🎵
## Introduction
This demo uses flask, librosa, madmom, HTML/CSS/JavaScript to create a smart metronome app, targeting for musical instrument players who would like to record their performance and get a report with beat analysis.
It's from Yi Shan's thesis project at NYU Music Tech Program.

## How to run
Two ways to create a clean environment are provided, you can choose one of them. 
Based on my experiment experience, `conda` is recommended.

### Conda
```
cd ./smartMetronome

# Create conda env
conda env create -f environment.yml

# Check Python3 path. 
which python3 # The path is expected as something like /opt/anaconda3/bin/python3

# Check pip3 path.
which pip3 # The path is expected as something like /opt/anaconda3/bin/pip3

# Run app.
Python3 app.py

```
### Virtualenv

```
# install virtualenv
pip install virtualenv

# create new virtual env
virtualenv venv

# activate env
//MacOS
source venv/bin/activate

//Windows
venv\Scripts\activate

# install requirements
pip install -r requirement.txt

# run
python3 app.py

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

## FAQ
* "No module named 'Cython'", or "No module named 'Numpy'" while installing Madmom
  * Install `Cython` and `Numpy` manually. See `requirements.txt` for exact version.

## Please note
* For now, there is always a delay after the recorder start. To avoid this temporarily, let the metronome tick for several seconds, then start playing.
* Any questions, please leave an issue.