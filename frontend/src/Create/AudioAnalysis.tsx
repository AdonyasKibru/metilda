import * as React from "react";
import PieMenu, { Slice } from "react-pie-menu";
import {connect} from "react-redux";
import {RouteComponentProps} from "react-router";
import {ThunkDispatch} from "redux-thunk";
import {css, ThemeProvider} from "styled-components";
import PitchRange from "../PitchArtWizard/AudioViewer/PitchRange";
import PlayerBar from "../PitchArtWizard/AudioViewer/PlayerBar";
import "../PitchArtWizard/GlobalStyling.css";
import {AppState} from "../store";
import {addLetter, addSpeaker, removeSpeaker, setLetterPitch, setUploadId} from "../store/audio/actions";
import {AudioAction} from "../store/audio/types";
import {Letter, Speaker} from "../types/types";
import AudioImg from "./AudioImg";
import AudioImgDefault from "./AudioImgDefault";
import AudioImgLoading from "./AudioImgLoading";
import * as audioImgMenuStyles from "./AudioImgMenu.styles";
import ExportMetildaTranscribe from "./ExportMetildaTranscribe";
import SpeakerControl from "./SpeakerControl";
import TargetPitchBar from "./TargetPitchBar";
import UploadAudio from "./UploadAudio";
import "./UploadAudio.css";

export interface Props extends RouteComponentProps {
    speakerIndex: number;
    speakers: Speaker[];
    addSpeaker: () => void;
    removeSpeaker: (speakerIndex: number) => void;
    setUploadId: (speakerIndex: number, uploadId: string) => void;
    addLetter: (speakerIndex: number, letter: Letter) => void;
    setLetterPitch: (speakerIndex: number, letterIndex: number, pitch: number) => void;
}

interface State {
    showImgMenu: boolean;
    imgMenuX: number;
    imgMenuY: number;
    isAudioImageLoaded: boolean;
    soundLength: number;
    selectionInterval: string;
    maxPitch: number;
    minPitch: number;
    imageUrl: string;
    audioUrl: string;
    audioEditVersion: number;
    minSelectX: number;
    maxSelectX: number;
    minAudioX: number;
    maxAudioX: number;
    minAudioTime: number;
    maxAudioTime: number;
    audioImgWidth: number;
    closeImgSelectionCallback: () => void;
    selectionCallback: (t1: number, t2: number) => void;
}

class AudioAnalysis extends React.Component<Props, State> {
    /**
     * WARNING:
     * MIN_IMAGE_XPERC and MAX_IMAGE_XPERC are statically set based
     * on the audio analysis image returned by the API. If the image
     * content changes, then these values should change.
     *
     * Also, a weird bug popped up once in the imgareaselect library up
     * that resulted in a infinite recursion. Once the dimensions
     * below were altered slightly, the bug went away. Likely it
     * was a result of a weird, undocumented edge case in that library.
     */
    static get MIN_IMAGE_XPERC(): number {
        return 351.0 / 2800.0;
    }

    static get MAX_IMAGE_XPERC(): number {
        return 2522.0 / 2800.0;
    }

    static get AUDIO_IMG_WIDTH(): number {
        return 653;
    }

    static get DEFAULT_MIN_ANALYSIS_PITCH(): number {
        return 75.0;
    }

    static get DEFAULT_MAX_ANALYSIS_PITCH(): number {
        return 500.0;
    }

    static get DEFAULT_SYLLABLE_TEXT(): string {
        return "X";
    }

    static get DEFAULT_SEPARATOR_TEXT(): string {
        return "";
    }

    static formatImageUrl(uploadId: string, minPitch?: number, maxPitch?: number, tmin?: number, tmax?: number) {
        let url = `/api/audio-analysis-image/${uploadId}.png`;
        const urlOptions = [];

        if (minPitch !== undefined) {
            urlOptions.push(`min-pitch=${minPitch}`);
        }

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

    static formatAudioUrl(uploadId: string, tmin?: number, tmax?: number) {
        if (tmin !== undefined && tmax !== undefined && tmax !== -1) {
            return `/api/audio/${uploadId}?tmin=${tmin}&tmax=${tmax}`;
        } else {
            return `/api/audio/${uploadId}`;
        }
    }

    constructor(props: Props) {
        super(props);

        this.state = {
            showImgMenu: false,
            imgMenuX: -1,
            imgMenuY: -1,
            isAudioImageLoaded: false,
            soundLength: -1,
            selectionInterval: "Letter",
            maxPitch: AudioAnalysis.DEFAULT_MAX_ANALYSIS_PITCH,
            minPitch: AudioAnalysis.DEFAULT_MIN_ANALYSIS_PITCH,
            imageUrl: AudioAnalysis.formatImageUrl(
                this.getSpeaker().uploadId,
                AudioAnalysis.DEFAULT_MIN_ANALYSIS_PITCH,
                AudioAnalysis.DEFAULT_MAX_ANALYSIS_PITCH),
            audioUrl: AudioAnalysis.formatAudioUrl(this.getSpeaker().uploadId),
            audioEditVersion: 0,
            minSelectX: -1,
            maxSelectX: -1,
            minAudioX: AudioAnalysis.MIN_IMAGE_XPERC * AudioAnalysis.AUDIO_IMG_WIDTH,
            maxAudioX: AudioAnalysis.MAX_IMAGE_XPERC * AudioAnalysis.AUDIO_IMG_WIDTH,
            minAudioTime: 0.0,
            maxAudioTime: -1.0,
            audioImgWidth: (AudioAnalysis.MAX_IMAGE_XPERC - AudioAnalysis.MIN_IMAGE_XPERC)
                * AudioAnalysis.AUDIO_IMG_WIDTH,
            closeImgSelectionCallback: () => (null),
            selectionCallback: (t1, t2) => (null),
        };
        this.imageIntervalSelected = this.imageIntervalSelected.bind(this);
        this.onAudioImageLoaded = this.onAudioImageLoaded.bind(this);
        this.audioIntervalSelected = this.audioIntervalSelected.bind(this);
        this.audioIntervalSelectionCanceled = this.audioIntervalSelectionCanceled.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.applyPitchRange = this.applyPitchRange.bind(this);
        this.showAllClicked = this.showAllClicked.bind(this);
        this.selectionIntervalClicked = this.selectionIntervalClicked.bind(this);
        this.pitchArtRangeClicked = this.pitchArtRangeClicked.bind(this);
        this.averagePitchArtClicked = this.averagePitchArtClicked.bind(this);
        this.manualPitchArtClicked = this.manualPitchArtClicked.bind(this);
        this.wordSplitClicked = this.wordSplitClicked.bind(this);
        this.imageIntervalToTimeInterval = this.imageIntervalToTimeInterval.bind(this);
        this.getAudioConfigForSelection = this.getAudioConfigForSelection.bind(this);
        this.manualPitchChange = this.manualPitchChange.bind(this);
        this.addPitch = this.addPitch.bind(this);
        this.targetPitchSelected = this.targetPitchSelected.bind(this);
    }

    getSpeaker = (): Speaker => {
        return this.props.speakers[this.props.speakerIndex];
    }

    componentDidMount() {
        const uploadId = this.getSpeaker().uploadId;
        if (!uploadId) {
            return;
        }

        const controller = this;
        const request: RequestInit = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({uploadId}),
        };

        const imageUrl = AudioAnalysis.formatImageUrl(
            uploadId,
            this.state.minPitch,
            this.state.maxPitch);

        const audioUrl = AudioAnalysis.formatAudioUrl(uploadId);

        fetch("/api/sound-length/" + uploadId, request)
            .then((response) => response.json())
            .then(function(data: any) {
                controller.setState({
                    imageUrl,
                    audioUrl,
                    soundLength: data.sound_length,
                    maxAudioTime: data.sound_length,
                });
            });
    }

    setUploadId = (uploadId: string) => {
        this.props.setUploadId(this.props.speakerIndex, uploadId);
    }

    getAudioConfigForSelection(leftX?: number, rightX?: number) {
        // Compute the new time scale
        let ts;
        if (leftX !== undefined && rightX !== undefined) {
            ts = this.imageIntervalToTimeInterval(leftX, rightX);
        } else {
            ts = [this.state.minAudioTime, this.state.maxAudioTime];
        }

        const newAudioUrl = AudioAnalysis.formatAudioUrl(
            this.getSpeaker().uploadId,
            ts[0],
            ts[1]);

        return {
            audioUrl: newAudioUrl,
            minAudioTime: ts[0],
            maxAudioTime: ts[1],
        };
    }

    targetPitchSelected(index: number) {
        if (index !== -1) {
            const letter = this.props.speakers[this.props.speakerIndex].letters[index];
            this.state.selectionCallback(letter.t0, letter.t1);

            const newAudioUrl = AudioAnalysis.formatAudioUrl(
                this.getSpeaker().uploadId,
                letter.t0,
                letter.t1);

            this.setState({
                audioUrl: newAudioUrl,
            });
        }
    }

    audioIntervalSelectionCanceled() {
        const config = this.getAudioConfigForSelection();
        this.setState({
            audioUrl: config.audioUrl,
            minSelectX: -1,
            maxSelectX: -1,
        });
    }

    audioIntervalSelected(leftX: number, rightX: number) {
        const config = this.getAudioConfigForSelection(leftX, rightX);
        this.setState({
            audioUrl: config.audioUrl,
            minSelectX: leftX,
            maxSelectX: rightX,
        });
    }

    addPitch(pitch: number, letter: string, ts: number[], isManualPitch: boolean = false, isWordSep: boolean = false) {
        if (!isWordSep) {
            if (pitch < this.state.minPitch || pitch > this.state.maxPitch) {
                // the pitch outside the bounds of the window, omit it
                return;
            }
        }

        if (ts[0] === ts[1]) {
            // add buffer to avoid adding a very narrow box to Target Pitch
            ts[0] = Math.max(ts[0] - 0.001, 0);
            ts[1] = Math.min(ts[1] + 0.001, this.state.soundLength);
        }

        const newLetter = {
            t0: ts[0],
            t1: ts[1],
            pitch,
            syllable: AudioAnalysis.DEFAULT_SYLLABLE_TEXT,
            isManualPitch,
            isWordSep,
        };

        this.props.addLetter(this.props.speakerIndex, newLetter);
        this.state.closeImgSelectionCallback();
    }

    imageIntervalSelected(leftX: number, rightX: number, manualPitch?: number, isWordSep: boolean = false) {
        const ts = this.imageIntervalToTimeInterval(leftX, rightX);

        if (manualPitch !== undefined) {
            this.addPitch(manualPitch, AudioAnalysis.DEFAULT_SYLLABLE_TEXT, ts, true);
            return;
        }

        if (isWordSep) {
            this.addPitch(-1, AudioAnalysis.DEFAULT_SEPARATOR_TEXT, ts, false, true);
            return;
        }

        fetch("/api/avg-pitch/"
            + this.getSpeaker().uploadId
            + "?t0=" + ts[0]
            + "&t1=" + ts[1]
            + "&max-pitch=" + this.state.maxPitch
            + "&min-pitch=" + this.state.minPitch, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => this.addPitch(data.avg_pitch, AudioAnalysis.DEFAULT_SYLLABLE_TEXT, ts, false),
            );
    }

    pitchArtRangeClicked() {
        const ts = this.imageIntervalToTimeInterval(this.state.minSelectX, this.state.maxSelectX);

        type ApiResult = number[][];

        fetch("/api/all-pitches/"
            + this.getSpeaker().uploadId + "?max-pitch="
            + this.state.maxPitch
            + "&min-pitch=" + this.state.minPitch
            + "&t0=" + ts[0]
            + "&t1=" + ts[1], {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
        })
            .then((response) => response.json())
            .then((data) => (data as ApiResult).map((item) => this.addPitch(item[1],
                AudioAnalysis.DEFAULT_SYLLABLE_TEXT,
                [item[0], item[0]])),
            );
    }

    averagePitchArtClicked() {
        this.imageIntervalSelected(
            this.state.minSelectX,
            this.state.maxSelectX);
    }

    wordSplitClicked() {
        this.imageIntervalSelected(
            this.state.minSelectX,
            this.state.maxSelectX,
            undefined,
            true);
    }

    manualPitchChange(index: number, newPitch: number) {
        this.props.setLetterPitch(this.props.speakerIndex, index, newPitch);
    }

    manualPitchArtClicked() {
        let manualPitch;
        let isValidNumber = false;

        while (!isValidNumber) {
            const msg = `Enter pitch value between ${this.state.minPitch.toFixed(2)}Hz `
                + `and ${this.state.maxPitch.toFixed(2)}Hz`;

            manualPitch = prompt(msg);

            if (manualPitch === null) {
                // user cancelled manual input
                this.state.closeImgSelectionCallback();
                return;
            }

            manualPitch = parseFloat(manualPitch);

            isValidNumber = !isNaN(manualPitch);

            if (!isValidNumber) {
                alert(`Invalid frequency, expected a number`);
                continue;
            }

            isValidNumber = !(manualPitch < this.state.minPitch || manualPitch > this.state.maxPitch);
            if (!isValidNumber) {
                const errorMsg
                    = `${manualPitch}Hz is not between between ${this.state.minPitch.toFixed(2)}Hz `
                    + `and ${this.state.maxPitch.toFixed(2)}Hz`;
                alert(errorMsg);
            }
        }

        this.imageIntervalSelected(
            this.state.minSelectX,
            this.state.maxSelectX,
            manualPitch);
    }

    onAudioImageLoaded(cancelCallback: () => void, selectionCallback: (t1: number, t2: number) => void) {
        this.setState({
            isAudioImageLoaded: true,
            closeImgSelectionCallback: cancelCallback,
            selectionCallback,
        });
    }

    handleInputChange(event: Event) {
        const target = event.target as HTMLInputElement;

        let value: boolean | File | string;
        if (target.type === "checkbox") {
            value = target.checked;
        } else if (target.type === "file") {
            value = target.files![0];
        } else {
            value = target.value;
        }

        const name = target.name;

        this.setState({[name]: value} as any);
    }

    applyPitchRange(minPitch: number, maxPitch: number) {
        const newUrl = AudioAnalysis.formatImageUrl(
            this.getSpeaker().uploadId,
            minPitch,
            maxPitch,
            this.state.minAudioTime,
            this.state.maxAudioTime);

        this.state.closeImgSelectionCallback();

        this.setState({
            imageUrl: newUrl,
            isAudioImageLoaded: false,
            audioEditVersion: this.state.audioEditVersion + 1,
            minPitch: minPitch || AudioAnalysis.DEFAULT_MIN_ANALYSIS_PITCH,
            maxPitch: maxPitch || AudioAnalysis.DEFAULT_MAX_ANALYSIS_PITCH,
        });
    }

    showAllClicked() {
        const newUrl = AudioAnalysis.formatImageUrl(
            this.getSpeaker().uploadId,
            this.state.minPitch,
            this.state.maxPitch,
            0,
            this.state.soundLength);

        const newAudioUrl = AudioAnalysis.formatAudioUrl(
            this.getSpeaker().uploadId,
            0,
            this.state.soundLength);

        this.state.closeImgSelectionCallback();

        this.setState({
            imageUrl: newUrl,
            audioUrl: newAudioUrl,
            isAudioImageLoaded: false,
            audioEditVersion: this.state.audioEditVersion + 1,
            minAudioTime: 0,
            maxAudioTime: this.state.soundLength,
        });
    }

    imageIntervalToTimeInterval(x1: number, x2: number) {
        const dt = this.state.maxAudioTime - this.state.minAudioTime;
        const dx = this.state.maxAudioX - this.state.minAudioX;
        const u0 = x1 / dx;
        const u1 = x2 / dx;

        const t0 = this.state.minAudioTime + (u0 * dt);
        const t1 = this.state.minAudioTime + (u1 * dt);
        return [t0, t1];
    }

    selectionIntervalClicked() {
        // Compute the new time scale
        const config = this.getAudioConfigForSelection(
            this.state.minSelectX,
            this.state.maxSelectX);

        const newImageUrl = AudioAnalysis.formatImageUrl(
            this.getSpeaker().uploadId,
            this.state.minPitch,
            this.state.maxPitch,
            config.minAudioTime,
            config.maxAudioTime);

        this.state.closeImgSelectionCallback();

        this.setState({
            imageUrl: newImageUrl,
            audioUrl: config.audioUrl,
            isAudioImageLoaded: false,
            audioEditVersion: this.state.audioEditVersion + 1,
            minAudioTime: config.minAudioTime,
            maxAudioTime: config.maxAudioTime,
        });
    }

    maybeRenderSpeakerControl = () => {
        const isLastSpeaker = this.props.speakerIndex === this.props.speakers.length - 1;
        const isFirstSpeaker = this.props.speakerIndex === 0;
        if (!(isLastSpeaker || !isFirstSpeaker)) {
            return;
        }

        return (
            <SpeakerControl
                addSpeaker={this.props.addSpeaker}
                removeSpeaker={() => this.props.removeSpeaker(this.props.speakerIndex)}
                canAddSpeaker={isLastSpeaker}
                canRemoveSpeaker={!isFirstSpeaker}/>
        );
    }

    showImgMenu = (imgMenuX: number, imgMenuY: number) => {
        this.setState({imgMenuX, imgMenuY});
    }

    maybeRenderImgMenu = () => {
        if (this.state.imgMenuX !== -1 && this.state.imgMenuY !== -1) {
            const theme = {
                pieMenu:  {
                    container: css`z-index: 10;`,
                },
                slice: {
                    container: audioImgMenuStyles.container,
                }
            };

            const isSelectionActive = this.state.minSelectX !== -1
                && this.state.maxSelectX !== -1;

            const isAllShown = this.state.minAudioTime === 0
                && this.state.maxAudioTime === this.state.soundLength;

            const maybeDo = (disabled: boolean, action: () => void) => {
                if (!disabled) {
                    action();
                }
            }

            return (
                <div onContextMenu={(e) => e.preventDefault()}
                     onClick={() => this.showImgMenu(-1, -1)}>
                    <ThemeProvider theme={theme}>
                        <PieMenu
                            radius="95px"
                            centerRadius="25px"
                            centerX={`${this.state.imgMenuX}px`}
                            centerY={`${this.state.imgMenuY}px`}
                        >
                            <Slice onSelect={() => maybeDo(!isSelectionActive, this.averagePitchArtClicked)}
                                   disabled={!isSelectionActive}
                                   backgroundColor="darkgrey">
                                <span>Average<br/>Pitch</span>
                            </Slice>
                            <Slice onSelect={() => maybeDo(!isSelectionActive, this.selectionIntervalClicked)}
                                   disabled={!isSelectionActive}
                                   backgroundColor="lightgrey">
                                <span>Select</span>
                            </Slice>
                            <Slice onSelect={() => maybeDo(!isSelectionActive, this.manualPitchArtClicked)}
                                   disabled={!isSelectionActive}
                                   backgroundColor="darkgrey">
                                <span>Manual<br/>Pitch</span>
                            </Slice>
                            <Slice onSelect={() => maybeDo(!isSelectionActive, this.pitchArtRangeClicked)}
                                   disabled={!isSelectionActive}
                                   backgroundColor="lightgrey">
                                <span>Range<br/>Pitch</span>
                            </Slice>
                            <Slice onSelect={() => maybeDo(!isSelectionActive, this.wordSplitClicked)}
                                   disabled={!isSelectionActive}
                                   backgroundColor="darkgrey">
                                <span>Split<br/>Word</span>
                            </Slice>
                            <Slice onSelect={() => maybeDo(isAllShown, this.showAllClicked)}
                                   disabled={isAllShown}
                                   backgroundColor="lightgrey">
                                <span>Show<br/>All</span>
                            </Slice>
                        </PieMenu>
                    </ThemeProvider>
                </div>
            );
        }
    }

    render() {
        const uploadId = this.getSpeaker().uploadId;

        let nonAudioImg;
        if (!uploadId) {
            nonAudioImg = <AudioImgDefault/>;
        } else if (!this.state.isAudioImageLoaded) {
            nonAudioImg = <AudioImgLoading/>;
        }

        const isSelectionActive = this.state.minSelectX !== -1
            && this.state.maxSelectX !== -1;
        const isAllShown = this.state.minAudioTime === 0
            && this.state.maxAudioTime === this.state.soundLength;

        return (
            <div>
                <div className="row">
                    <div className="metilda-audio-analysis-controls-list col s4">
                        <h6 className="metilda-control-header">Speaker {this.props.speakerIndex + 1}</h6>
                        <UploadAudio initFileName={uploadId} setUploadId={this.setUploadId}/>
                        <PitchRange initMinPitch={this.state.minPitch}
                                    initMaxPitch={this.state.maxPitch}
                                    applyPitchRange={this.applyPitchRange}/>
                        <ExportMetildaTranscribe
                            word={uploadId}
                            speakerIndex={this.props.speakerIndex}/>
                        {this.maybeRenderSpeakerControl()}
                    </div>
                    <div className="metilda-audio-analysis col s8">
                        <div>
                            <div className="metilda-audio-analysis-image-container">
                                {nonAudioImg}
                                {this.maybeRenderImgMenu()}
                                {
                                    uploadId ?
                                        <AudioImg
                                            key={this.state.audioEditVersion}
                                            uploadId={uploadId}
                                            speakerIndex={this.props.speakerIndex}
                                            src={this.state.imageUrl}
                                            ref="audioImage"
                                            imageWidth={AudioAnalysis.AUDIO_IMG_WIDTH}
                                            xminPerc={AudioAnalysis.MIN_IMAGE_XPERC}
                                            xmaxPerc={AudioAnalysis.MAX_IMAGE_XPERC}
                                            audioIntervalSelected={this.audioIntervalSelected}
                                            audioIntervalSelectionCanceled={this.audioIntervalSelectionCanceled}
                                            onAudioImageLoaded={this.onAudioImageLoaded}
                                            showImgMenu={this.showImgMenu}
                                            minAudioX={this.state.minAudioX}
                                            maxAudioX={this.state.maxAudioX}
                                            minAudioTime={this.state.minAudioTime}
                                            maxAudioTime={this.state.maxAudioTime}/>
                                        : []
                                }
                            </div>
                            {uploadId && <PlayerBar key={this.state.audioUrl} audioUrl={this.state.audioUrl}/>}
                            <TargetPitchBar letters={this.props.speakers}
                                            minAudioX={this.state.minAudioX}
                                            maxAudioX={this.state.maxAudioX}
                                            minAudioTime={this.state.minAudioTime}
                                            maxAudioTime={this.state.maxAudioTime}
                                            targetPitchSelected={this.targetPitchSelected}
                                            speakerIndex={this.props.speakerIndex}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state: AppState) => ({
    speakers: state.audio.speakers,
});

const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, void, AudioAction>) => ({
    addSpeaker: () => dispatch(addSpeaker()),
    removeSpeaker: (speakerIndex: number) => dispatch(removeSpeaker(speakerIndex)),
    setUploadId: (speakerIndex: number, uploadId: string) => dispatch(setUploadId(speakerIndex, uploadId)),
    addLetter: (speakerIndex: number, newLetter: Letter) => dispatch(addLetter(speakerIndex, newLetter)),
    setLetterPitch: (speakerIndex: number, letterIndex: number, newPitch: number) =>
        dispatch(setLetterPitch(speakerIndex, letterIndex, newPitch)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AudioAnalysis);
