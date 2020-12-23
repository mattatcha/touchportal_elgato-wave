function SetMicrophoneSettings (inContext, inSettings) {
    this.timer;
    this.typ = "SetMicrophoneSettings";

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {        
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
            this.awl.showAlert(inContext);
        } else {
            switch (this.settings.micSettingsAction) {
                case "adjustGain":
                    this.adjustMicGain();
                    break;
                case "setGain":
                    this.wlc.setMicGain(this.settings.volValue);
                    break;
                case "adjustOutput":
                    this.adjustMicOutputVolume();
                    break;
                case "setOutput":
                    this.wlc.setMicOutputVolume(this.settings.volValue);
                    break;    
                case "adjustMic/PcBalance":
                    this.adjustMicBalance();
                    break;  
                case "setMic/PcBalance":
                    this.wlc.setMicBalance(this.settings.volValue);
                    break; 
                default:
                    break;
            }
        }
    };

    this.onKeyUp = (inContext, inSettings, inCoordinates, inUserDesiredState, inState) => {
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected) {
            this.awl.showAlert(inContext);
        } else {
            switch (this.settings.micSettingsAction) {
                case "setLowcut":
                    this.wlc.setLowcut();
                    break;
                case "setClipguard":
                    this.wlc.setClipguard();
                    break;
                default:
                    clearTimeout(this.timer);
                    break;
            }
        }
    }

    this.adjustMicGain = () =>
    {
        this.wlc.adjustMicGain(this.settings.volValue);
        this.timer = setTimeout( () => this.adjustMicGain(), 200);
    }

    this.adjustMicOutputVolume = () =>
    {
        this.wlc.adjustMicOutputVolume(this.settings.volValue);
        this.timer = setTimeout( () => this.adjustMicOutputVolume(), 200);
    }

    this.adjustMicBalance = () =>
    {
        this.wlc.adjustMicBalance(this.settings.volValue);
        this.timer = setTimeout( () => this.adjustMicBalance(), 200);
    }

    this.updateState = () => {}

    this.updateImage = () => {
        const setLocalImage = (inImage) => this.awl.setImage(inContext, getImage(inImage));
        
        if (this.wlc.micSettings) {
            switch (this.settings.micSettingsAction) {
                case "adjustGain":
                    setLocalImage((this.settings.volValue > 0) ? "Mic Adjust Gain +" : "Mic Adjust Gain -");
                    break;
                case "setGain":
                    setLocalImage("Mic Set Gain");
                    break;
                case "adjustOutput":
                    setLocalImage((this.settings.volValue > 0) ? "Mic Adjust Output +" : "Mic Adjust Output -");
                    break;
                case "setOutput":
                    setLocalImage("Mic Set Output Volume");
                    break;    
                case "adjustMic/PcBalance":
                    setLocalImage((this.settings.volValue > 0) ? "Mic Adjust Balance +" : "Mic Adjust Balance -");
                    break;  
                case "setMic/PcBalance":
                    setLocalImage("Mic Set Balance");
                    break; 
                case "setLowcut":
                    setLocalImage(~~this.wlc.micSettings.isMicrophoneLowcutOn ? "Mic Lowcut on" : "Mic Lowcut off");
                    break;
                case "setClipguard":
                    setLocalImage(~~this.wlc.micSettings.isMicrophoneClipguardOn ? "Mic Clipguard On" : "Mic Clipguard Off");
                    break;
                default:
                    break;
            }
        }
    }

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.setmicsettings");
    
};