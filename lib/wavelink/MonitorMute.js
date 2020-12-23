function MonitorMute(inContext, inSettings) {

    this.typ = 'MonitorMute';

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {};

    this.onKeyUp = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
            this.awl.showAlert(inContext);
        } else {
            monitoringOrStream = this.settings.inputMixer;
            this.wlc.setMute('output', null, monitoringOrStream);
        }
    };

    this.updateState = () => {
        var output = this.wlc.getOutputMixer();
        var name = '';

        switch (this.settings.inputMixer) {
        case 'local':
            name = ' ' + output.localVolOut + ' %';
            state = ~~output.isLocalMuteOut;
            break;
        case 'stream':
            name = ' ' + output.streamVolOut + ' %';
            state = ~~output.isStreamMuteOut;
            break;
        case 'both':
            name = ' ' + output.streamVolOut + ' %';
            state = ~~output.isStreamMuteOut;
            break;
        default:
            break;
        }

        this.awl.setState(inContext, state);
        this.awl.setTitle(inContext, name);
    };

    this.updateImage = () => {

        const setLocalImage = (inImage, state) => this.awl.setImage(inContext, getImage(inImage), state);

        const setStateImages = (unMuteIcon, muteIcon) => {
            setLocalImage(unMuteIcon, 0);
            setLocalImage(muteIcon, 1);
        }

        switch (this.settings.inputMixer) {
            case 'local':
                setStateImages('Output Local', 'Output Local Mute');
                break;
            case 'stream':
                setStateImages('Output Stream', 'Output Stream Mute');
                break;
            case 'both':
                setStateImages('Output', 'Output Mute');
                break;
            default:
                break;
            }
    };

    WaveLinkAction.call(this, inContext, inSettings, 'com.elgato.wavelink.monitormute');
}