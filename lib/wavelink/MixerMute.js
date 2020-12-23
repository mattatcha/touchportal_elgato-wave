function MixerMute(inContext, inSettings, inDevice) {

    this.typ = "MixerMute";

    this.onKeyUp = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {
        if(!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
            this.awl.showAlert(inContext);
        } else {
            const mixId = this.getMixId(inDevice);
            const mixer = this.wlc.getMixer(mixId);

            if (mixer && mixer.isAvailable) {
                this.wlc.setMute("input", mixId, this.settings.inputMixer);
            } else {
                this.awl.showAlert(inContext);
            }
        }
    };

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {};

    this.updateState = () => {
        const mixId = this.getMixId(inDevice);
        const mixer = this.wlc.getMixer(mixId);
        var name = this.settings.name || '';
        var state = 0;
        var fixedName = '';

        if (mixer && mixer.isAvailable) {
            fixedName = name == "" ? this.fixName(mixer.name) : this.fixName(name);

            switch(this.settings.inputMixer) {
                case "local":
                    name = fixedName + "\n" + "\n" + "\n" + mixer.localVolIn + ' %';
                    state = ~~mixer.isLocalMuteIn;
                    break;
                case "stream":
                    name = fixedName + "\n" + "\n" + "\n" + mixer.streamVolIn + " %";
                    state = ~~mixer.isStreamMuteIn;
                    break;
                case "both":
                    name = fixedName + "\n" + "\n" + "\n" + mixer.localVolIn + ' %';
                    state = ~~mixer.isLocalMuteIn;
                    break;
                default:
                    break;
            }
            this.awl.setState(inContext, state);
            this.awl.setTitle(inContext, name);
        }
    }

    this.updateImage = () => {

        const mixId = this.getMixId(inDevice);
        const mixer = this.wlc.getMixer(mixId);
        const hasIconData = (mixer && mixer.iconData && (mixer.iconData.length > 0));

        const setLocalImage = (inImage, state) => this.awl.setImage(inContext, this.awl.setBGColor(mixer.bgColor, getImage(inImage)), state);
        const setMutedImage = (inImage, state) => this.wlc.loadImage(['data:image/png;base64,' + inImage, 'images/actionspng/Mute.png']).then(img => {this.awl.setImage(inContext, img, state);}).catch(e => {console.log('Error IMG');});
        const setUnmutedImage = (inImage, state) => this.wlc.loadImage(['data:image/png;base64,' + inImage]).then(img => {this.awl.setImage(inContext, img, state);}).catch(e => {console.log('Error IMG');});
        
        const setStateImages = (muteIcon, unMuteIcon) => {
            hasIconData ? setUnmutedImage(mixer.iconData, 0) : setLocalImage(unMuteIcon, 0);
            hasIconData ? setMutedImage(mixer.iconData, 1) : setLocalImage(muteIcon, 1);
        }

        if (mixer) {
            if (mixer.isAvailable || mixer.inputType == 4) {
                switch (this.settings.inputMixer) {
                    case 'local':
                        setStateImages(mixer.iconMuteLocal, mixer.iconUnmuteLocal);
                        break;
                    case 'stream':
                        setStateImages(mixer.iconMuteStream, mixer.iconUnmuteStream);
                        break;
                    case 'both':
                        setStateImages(mixer.iconMuteBoth, mixer.iconUnmuteBoth);
                        break;
                    default:
                        break;
                }
            } else {
                this.awl.setTitle(inContext, "");
            }    
        }
    }

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.mixermute");
};