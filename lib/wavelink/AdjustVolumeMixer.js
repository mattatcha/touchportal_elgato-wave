function AdjustVolumeMixer(inContext, inSettings, inDevice) {
    this.slider;
    this.vol;
    this.mixId;
    this.timerKeyPressed;
    this.typ = "AdjustVolumeMixer";

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {        
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
            this.awl.showAlert(inContext);
        } else {
            this.mixId = this.getMixId(inDevice);
            const mixer = this.wlc.getMixer(this.mixId);

            if (mixer && mixer.isAvailable) {
                this.slider = this.settings.inputMixer;
                this.vol = this.settings.volValue;
                this.adjustVolume();
            } else {
                this.awl.showAlert(inContext);
            }
        }
    }

    this.onKeyUp = () => {
        if (this.timerKeyPressed) clearTimeout(this.timerKeyPressed);
    }

    this.adjustVolume = () => {
        this.wlc.adjustVolume("input", this.mixId, this.slider, this.vol);
        this.timerKeyPressed = setTimeout(() => this.adjustVolume(), 200);       
    }

    this.updateState = () => {}

    this.updateImage = () => {
        const mixId = this.getMixId(inDevice);
        const mixer = this.wlc.getMixer(mixId);
        const inImage = this.settings.volValue > 0 ? "Plus" : "Minus";
        
        if (mixer && mixer.isAvailable) {
            this.awl.setImage(inContext, this.awl.setBGColor(mixer.bgColor, getImage(inImage)), 0);
        }
    }

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.adjustvolumemixer");
};