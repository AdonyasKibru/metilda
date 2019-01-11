import React, {Component} from 'react';
import 'materialize-css';
import 'materialize-css/dist/css/materialize.min.css';
import './UploadAudio.css';
import AudioImg from "./AudioImg";
import AudioImgLoading from "./AudioImgLoading";
import AudioLetter from "./AudioLetter";
import {Redirect} from "react-router-dom";
import PitchArt from "./PitchArt";
import PitchArtDrawingWindow from "./PitchArtDrawingWindow";
import {connect} from "react-redux";
import {audioSelectionAction} from "../actions/audioAnalysisActions";
import PlayerBar from "./AudioViewer/PlayerBar";
import MaxFrequencyBar from "./AudioViewer/MaxFrequencyBar";
import TargetPitchBar from "./TargetPitchBar";


class TranscribeAudio extends Component {
    state = {};

    static get MIN_IMAGE_XPERC() {
        return 320.0 / 2560.0;
    }

    static get MAX_IMAGE_XPERC() {
        return 2306.0 / 2560.0;
    }

    static get AUDIO_IMG_WIDTH() {
        return 800;
    }

    constructor(props) {
        super(props);

        const {uploadId} = this.props.match.params;
        this.state = {
            letters: [],
            isAudioImageLoaded: false,
            soundLength: -1,
            selectionInterval: "Letter",
            letterEditVersion: 0,
            redirectId: null,
            maxPitch: "",
            imageUrl: TranscribeAudio.formatImageUrl(uploadId),
            audioUrl: TranscribeAudio.formatAudioUrl(uploadId),
            audioEditVersion: 0,
            minSelectX: -1,
            maxSelectX: -1,
            minAudioX: TranscribeAudio.MIN_IMAGE_XPERC * TranscribeAudio.AUDIO_IMG_WIDTH,
            maxAudioX: TranscribeAudio.MAX_IMAGE_XPERC * TranscribeAudio.AUDIO_IMG_WIDTH,
            minAudioTime: 0.0,
            maxAudioTime: -1.0,
            audioImgWidth: (TranscribeAudio.MAX_IMAGE_XPERC - TranscribeAudio.MIN_IMAGE_XPERC)
                * TranscribeAudio.AUDIO_IMG_WIDTH,
            closeImgSelectionCallback: () => (null)
        };
        this.imageIntervalSelected = this.imageIntervalSelected.bind(this);
        this.onAudioImageLoaded = this.onAudioImageLoaded.bind(this);
        this.audioIntervalSelected = this.audioIntervalSelected.bind(this);
        this.audioIntervalSelectionCanceled = this.audioIntervalSelectionCanceled.bind(this);

        this.nextClicked = this.nextClicked.bind(this);
        this.resetAllLetters = this.resetAllLetters.bind(this);
        this.removeLetter = this.removeLetter.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.applyMaxPitch = this.applyMaxPitch.bind(this);
        this.showAllClicked = this.showAllClicked.bind(this);
        this.selectionIntervalClicked = this.selectionIntervalClicked.bind(this);
        this.pitchArtClicked = this.pitchArtClicked.bind(this);
        this.imageIntervalToTimeInterval = this.imageIntervalToTimeInterval.bind(this);

        // 94 quarter tones below A4
        this.minVertPitch = 30.0;

        // 11 quarter tones above A4
        this.maxVertPitch = 604.53;
    }

    static formatImageUrl(uploadId, maxPitch, tmin, tmax) {
        let url = `/api/audio-analysis-image/${uploadId}.png`;
        let urlOptions = [];

        if (maxPitch !== undefined) {
            urlOptions.push(`max-pitch=${maxPitch}`);
        }

        if (tmin !== undefined) {
            urlOptions.push(`tmin=${tmin}`);
        }

        if (tmax !== undefined) {
            urlOptions.push(`&tmax=${tmax}`);
        }

        if (urlOptions.length > 0) {
            url += "?" + urlOptions.join("&");
        }

        return url;
    }

    static formatAudioUrl(uploadId, tmin, tmax) {
        if (tmin !== undefined && tmax !== undefined && tmax !== -1) {
            return `/api/audio/${uploadId}?tmin=${tmin}&tmax=${tmax}`;
        } else {
            return `/api/audio/${uploadId}`;
        }
    }

    componentDidMount() {
        const {uploadId} = this.props.match.params;
        var controller = this;
        fetch("/api/sound-length/" + uploadId, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: {uploadId: uploadId}
        })
            .then(response => response.json())
            .then(function (data) {
                controller.setState({
                    soundLength: data["sound_length"],
                    maxAudioTime: data["sound_length"]
                });
            });
    }

    audioIntervalSelectionCanceled() {
        this.setState({minSelectX: -1, maxSelectX: -1});
    }

    audioIntervalSelected(leftX, rightX) {
        this.setState({minSelectX: leftX, maxSelectX: rightX});
    }

    imageIntervalSelected(leftX, rightX) {
        let letter = "X";

        let ts = this.imageIntervalToTimeInterval(leftX, rightX);

        const controller = this;
        const {uploadId} = this.props.match.params;
        let json = {
            "time_ranges": [ts]
        };

        fetch("/api/max-pitches/" + uploadId + "?max-pitch=" + this.state.maxPitch, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(json)
        })
            .then(response => response.json())
            .then(function (data) {
                    let pitch = data[0];
                    if (pitch < controller.minVertPitch || pitch > controller.maxVertPitch) {
                        // the pitch outside the bounds of the window, omit it
                        return
                    }

                    controller.setState(prevState =>
                        ({
                            letters: prevState.letters.concat({
                                letter: letter,
                                leftX: -1,
                                rightX: -1,
                                t0: ts[0],
                                t1: ts[1],
                                pitch: pitch
                            }),
                            letterEditVersion: prevState.letterEditVersion + 1
                        })
                    )
                }
            )

        this.state.closeImgSelectionCallback();
    }

    pitchArtClicked() {
        this.imageIntervalSelected(this.state.minSelectX,
            this.state.maxSelectX);
    }

    nextClicked() {
        const {uploadId} = this.props.match.params;
        this.setState({redirectId: uploadId});
    }

    removeLetter(index) {
        this.setState(prevState => (
            {letters: prevState.letters.filter((_, i) => i !== index),
             letterEditVersion: prevState.letterEditVersion + 1})
        );
    }

    resetAllLetters() {
        this.setState(prevState => (
            {letters: [], letterEditVersion: prevState.letterEditVersion + 1})
        );
    }

    onAudioImageLoaded(cancelCallback) {
        this.setState({
            isAudioImageLoaded: true,
            closeImgSelectionCallback: cancelCallback
        });
    }

    handleInputChange(event) {
        const target = event.target;

        let value = null;
        if (target.type === "checkbox") {
            value = target.checked;
        } else if (target.type === "file") {
            value = target.files[0];
        } else {
            value = target.value;
        }

        const name = target.name;

        this.setState({
            [name]: value
        });
    }

    applyMaxPitch() {
        const {uploadId} = this.props.match.params;
        let newUrl = TranscribeAudio.formatImageUrl(
            uploadId,
            this.state.maxPitch,
            this.state.minAudioTime,
            this.state.maxAudioTime);
        this.setState({
            imageUrl: newUrl,
            isAudioImageLoaded: false,
            audioEditVersion: this.state.audioEditVersion + 1
        });
    }

    showAllClicked() {
        const {uploadId} = this.props.match.params;
        let newUrl = TranscribeAudio.formatImageUrl(
            uploadId,
            this.state.maxPitch,
            0,
            this.state.soundLength);

        let newAudioUrl = TranscribeAudio.formatAudioUrl(
            uploadId,
            0,
            this.state.soundLength);

        this.setState({
            imageUrl: newUrl,
            audioUrl: newAudioUrl,
            isAudioImageLoaded: false,
            audioEditVersion: this.state.audioEditVersion + 1,
            minAudioTime: 0,
            maxAudioTime: this.state.soundLength
        });
        this.state.closeImgSelectionCallback();
    }

    imageIntervalToTimeInterval(x1, x2) {
        let dt = this.state.maxAudioTime - this.state.minAudioTime;
        let dx = this.state.maxAudioX - this.state.minAudioX;
        let u0 = (x1 - this.state.minAudioX) / dx;
        let u1 = (x2 - this.state.minAudioX) / dx;

        let t0 = this.state.minAudioTime + (u0 * dt);
        let t1 = this.state.minAudioTime + (u1 * dt);

        return [t0, t1];
    }

    selectionIntervalClicked() {
        // Compute the new time scale
        let ts = this.imageIntervalToTimeInterval(
            this.state.minSelectX,
            this.state.maxSelectX);

        const {uploadId} = this.props.match.params;
        let newImageUrl = TranscribeAudio.formatImageUrl(
            uploadId,
            this.state.maxPitch,
            ts[0],
            ts[1]);

        let newAudioUrl = TranscribeAudio.formatAudioUrl(
            uploadId,
            ts[0],
            ts[1]);

        this.setState({
            imageUrl: newImageUrl,
            audioUrl: newAudioUrl,
            isAudioImageLoaded: false,
            audioEditVersion: this.state.audioEditVersion + 1,
            minAudioTime: ts[0],
            maxAudioTime: ts[1]
        });

        this.state.closeImgSelectionCallback();
    }

    render() {
        if (this.state.redirectId !== null) {
            let pitchesString = this.state.letters.map(item => "p=" + item.pitch).join("&");
            return <Redirect push to={"/pitchartwizard/4/" + this.state.redirectId + "?" + pitchesString}/>
        }

        const {uploadId} = this.props.match.params;

        let audioImageLoading;
        if (!this.state.isAudioImageLoaded) {
            audioImageLoading = <AudioImgLoading/>
        }

        let pitchArt;
        if (this.state.letters.length > 1) {
            let timesAndPitches = this.state.letters.map(item => [item.t0, item.pitch]);
            let sortedTimesAndPitches = timesAndPitches.sort((a, b) => a[0] - b[0]);
            let sortedPitches = sortedTimesAndPitches.map(item => item[1]);
            let sortedTimes = sortedTimesAndPitches.map(item => item[0] * this.state.soundLength);

            pitchArt = <div>
                <PitchArtDrawingWindow
                    width={700}
                    height={600}
                    key={this.state.letterEditVersion}
                    minVertPitch={this.minVertPitch}
                    maxVertPitch={this.maxVertPitch}
                    uploadId={uploadId}
                    pitches={sortedPitches}
                    times={sortedTimes}/>
                <PitchArt width={700}
                          height={600}
                          key={this.state.letterEditVersion + 1}
                          minVertPitch={this.minVertPitch}
                          maxVertPitch={this.maxVertPitch}
                          uploadId={uploadId}
                          pitches={sortedPitches}
                          times={sortedTimes}/>
            </div>;
        }

        const isSelectionActive = this.state.minSelectX !== -1
            && this.state.maxSelectX !== -1;
        const isAllShown = this.state.minAudioTime === 0
            && this.state.maxAudioTime === this.state.soundLength;

        return (
            <div>
                <div className="wizard-header">
                    <h3>Pitch Art Wizard</h3>
                    <h4>Transcribe Audio (step 2/2)</h4>
                </div>
                <div className="metilda-audio-analysis-layout">
                    <div className="metilda-audio-analysis">
                        <div>
                            <div className="metilda-audio-analysis-image-container">
                                {audioImageLoading}
                                <AudioImg key={this.state.audioEditVersion}
                                          uploadId={uploadId}
                                          src={this.state.imageUrl}
                                          ref="audioImage"
                                          xminPerc={TranscribeAudio.MIN_IMAGE_XPERC}
                                          xmaxPerc={TranscribeAudio.MAX_IMAGE_XPERC}
                                          audioIntervalSelected={this.audioIntervalSelected}
                                          audioIntervalSelectionCanceled={this.audioIntervalSelectionCanceled}
                                          onAudioImageLoaded={this.onAudioImageLoaded}/>
                            </div>
                            <div id="metilda-audio-function-btns">
                                <button className="waves-effect waves-light btn"
                                        onClick={this.showAllClicked}
                                        disabled={isAllShown}>All
                                </button>
                                <button className="waves-effect waves-light btn"
                                        onClick={this.selectionIntervalClicked}
                                        disabled={!isSelectionActive}>Sel
                                </button>
                                <button className="waves-effect waves-light btn"
                                        onClick={this.pitchArtClicked}
                                        disabled={!isSelectionActive}>Pch
                                </button>
                            </div>
                            <PlayerBar audioUrl={this.state.audioUrl} />
                            <MaxFrequencyBar handleInputChange={this.handleInputChange}
                                             applyMaxPitch={this.applyMaxPitch}/>
                            <TargetPitchBar letters={this.state.letters}
                                            key={this.state.letterEditVersion}
                                            letterEdit
                                            removeLetter={this.removeLetter}
                                            resetAllLetters={this.resetAllLetters}
                                            minAudioX={this.state.minAudioX}
                                            maxAudioX={this.state.maxAudioX}
                                            minAudioTime={this.state.minAudioTime}
                                            maxAudioTime={this.state.maxAudioTime}/>
                        </div>
                    </div>
                    <div className="metilda-audio-analysis-pitch-art">
                        {pitchArt}
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    ...state
});

export default connect(mapStateToProps, null)(TranscribeAudio);