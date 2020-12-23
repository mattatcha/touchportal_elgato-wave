function ToggleMonitorMixOutput(inContext, inSettings, inDevice) {
    this.typ = "ToggleMonitorMixOutput";

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {
        // Putting key-function here results in showing wrong state
    }

    this.onKeyUp = () => {
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
            this.awl.showAlert(inContext);
        } else {
            debug("Selcetd, prim, sec:", this.wlc.selectedMonitorMix,  this.settings.primOutput, this.settings.secOutput)
            if (this.wlc.selectedMonitorMix == this.settings.primOutput) {
                debug("Case 1: Switch from", this.wlc.selectedMonitorMix, "to", this.settings.secOutput)
                this.wlc.setMonitorMixOutput(this.settings.secOutput);
            } else if (this.wlc.selectedMonitorMix == this.settings.secOutput) {
                debug("Case 2: Switch from", this.wlc.selectedMonitorMix, "to", this.settings.primOutput)
                this.wlc.setMonitorMixOutput(this.settings.primOutput);
            } else {
                debug("Case 3: No match, switch to", this.settings.primOutput)
                this.wlc.setMonitorMixOutput(this.settings.primOutput);
            }
        }
    }

    this.updateState = () => {
        if (this.wlc.selectedMonitorMix == this.settings.primOutput) {
            this.awl.setState(inContext, 0);
        } else if (this.wlc.selectedMonitorMix == this.settings.secOutput) {
            this.awl.setState(inContext, 1);
        }
    }

    this.updateImage = () => {}

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.togglemonitormixoutput");
};