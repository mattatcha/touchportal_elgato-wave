function SwitchMonitoring(inContext, inSettings) {

    this.typ = "SwitchMonitoring";

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {
        // Putting key-function here results in showing wrong state
    }

    this.onKeyUp = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) 
    {
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate)  
        {
            this.awl.showAlert(inContext);
        } else {
            if (this.wlc.switchState == "LocalMix") 
            {
                this.wlc.changeSwitchState("StreamMix");
            } else if (this.wlc.switchState == "StreamMix") 
            {
                this.wlc.changeSwitchState("LocalMix");
            }
        }
    };

    this.updateState = () => 
    {      
        const switchState = this.wlc.getSwitch();
        const state = (switchState == "LocalMix") ? 0 : 1;
        this.awl.setState(inContext, state);
    }

    this.updateImage = () => {}

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.switchmonitoring");
};