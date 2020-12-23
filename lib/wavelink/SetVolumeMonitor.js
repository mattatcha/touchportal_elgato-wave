function SetVolumeMonitor(inContext, inSettings) 
{
    this.typ = "SetVolumeMonitor";

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
            this.awl.showAlert(inContext);
        } else {          
            const mixer = this.wlc.output;
            const isNotBlocked = this.settings.inputMixer == 'local' ? mixer.isNotBlockedLocal : mixer.isNotBlockedStream;
            
            if (isNotBlocked) {
                this.wlc.setVolume('output', null, this.settings.inputMixer, this.settings.volValue, this.settings.fadingDelay);
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
        const setLocalImage = (inImage) => this.awl.setImage(inContext, this.awl.setBGColor('#1E183C', getImage(inImage)));

        setLocalImage("Set");
    }

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.setvolumemonitor");
};