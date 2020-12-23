function AdjustVolumeMonitor(inContext, inSettings) 
{
    this.inputMixer;
    this.vol;
    this.timerKeyPressed;
    this.typ = "AdjustVolumeMonitor";

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
            this.awl.showAlert(inContext);
        } else {
            this.inputMixer = this.settings.inputMixer;
            this.vol = this.settings.volValue;
            this.adjustVolume();
        }
    };

    this.onKeyUp = () => {
        if (this.timerKeyPressed) clearTimeout(this.timerKeyPressed);
    }

    this.adjustVolume = () => {
        this.wlc.adjustVolume("output", null, this.inputMixer, this.vol);
        this.timerKeyPressed = setTimeout(() => this.adjustVolume(), 200);
    }

    this.updateState = () => {}

    this.updateImage = () => {
        const inImage = this.settings.volValue > 0 ? "Plus" : "Minus";
        
        if (inImage) {
            this.awl.setImage(inContext, this.awl.setBGColor('#1E183C', getImage(inImage)), 0);
        }
    }

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.adjustvolumemonitor");
};