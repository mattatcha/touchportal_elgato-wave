function SetVolumeMixer(inContext, inSettings) {

    this.typ = "SetVolumeMixer";

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
            this.awl.showAlert(inContext);
        } else {
            const mixId = this.getMixId();
            const mixer = this.wlc.getMixer(mixId);
            const isNotBlocked = this.settings.inputMixer == 'local' ? mixer.isNotBlockedLocal : mixer.isNotBlockedStream;
            
            if (mixer && mixer.isAvailable && isNotBlocked) {
                this.wlc.setVolume('input', mixId, this.settings.inputMixer, this.settings.volValue, this.settings.fadingDelay);
                if (this.settings.fadingDelay > 0) {
                    setTimeout(() => { this.awl.showOk(inContext); }, this.settings.fadingDelay + 50) 
                }                 
            } else {
                this.awl.showAlert(inContext);
            }
        }
    };

    this.onKeyUp = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {}

    this.updateState = () => {}

    this.updateImage = () => {
        const mixId = this.getMixId();
        const mixer = this.wlc.getMixer(mixId);
        
        const setLocalImage = (inImage) => this.awl.setImage(inContext, this.awl.setBGColor(mixer.bgColor, getImage(inImage)));

        if (mixer) setLocalImage("Set");
    }

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.setvolumemixer");
};