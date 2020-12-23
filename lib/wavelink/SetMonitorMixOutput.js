function SetMonitorMixOutput(inContext, inSettings, inDevice) {
    this.typ = "SetMonitorMixOutput";

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {        
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
            this.awl.showAlert(inContext);
        } else {
            if (this.wlc.selectedMonitorMix != this.settings.primOutput) {
                debug("Set from", this.wlc.selectedMonitorMix, "to", this.settings.primOutput)
                this.wlc.setMonitorMixOutput(this.settings.primOutput);
            }
        }
    }

    this.onKeyUp = () => {}

    this.updateState = () => {}

    this.updateImage = () => {}

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.setmonitormixoutput");
};