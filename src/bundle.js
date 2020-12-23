/** ELGEvents
 * Publish/Subscribe pattern to quickly signal events to
 * the plugin, property inspector and data.
 */

const ELGEvents = {
    eventEmitter: function(name, fn) {
        const eventList = new Map();

        const on = (name, fn) => {
            if (!eventList.has(name)) eventList.set(name, ELGEvents.pubSub());

            return eventList.get(name).sub(fn);
        };

        const has = name => eventList.has(name);

        const emit = (name, data) => eventList.has(name) && eventList.get(name).pub(data);

        return Object.freeze({ on, has, emit, eventList });
    },

    pubSub: function pubSub() {
        const subscribers = new Set();

        const sub = fn => {
            subscribers.add(fn);
            return () => {
                subscribers.delete(fn);
            };
        };

        const pub = data => subscribers.forEach(fn => fn(data));
        return Object.freeze({ pub, sub });
    }
};
function WaveLinkAction(inContext, inSettings, inUUID) {
    this.context = inContext;
    this.settings = inSettings;
    this.uuid = inUUID;

    this.awl = new AppWaveLink();
    this.wlc = new WaveLinkClient();

    // Time for setVolume() fading interval in ms
    this.interval = 100;

    this.UP_MAC = this.wlc.UP_MAC; 
    this.UP_WINDOWS = this.wlc.UP_WINDOWS; 

    if (this.settings.inputMixer == null) {
        this.settings.inputMixer = "local";
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }
    
    if (this.settings.volValue == null) {
        this.settings.volValue = 25;
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    if (this.settings.activeProfile == null) {
        this.settings.activeProfile = "inputs";
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    if (this.settings.channelPos == null) {
        this.settings.channelPos = "1";
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    if (this.settings.name == null) {
        this.settings.name = "";
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    if (this.settings.isConfigured == null) {
        this.settings.isConfigured = false;
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    if (this.settings.isLinked == null) {
        this.settings.isLinked = false;
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    this.listeners = [];

    this.removeListeners = function() {
        this.listeners.forEach(function(e, i) {
            e();
            e = null;
        });
        this.listeners = [];
    };

    this.updatePI = function(isConnected, isUpToDate) {
        if (!isConnected || !isUpToDate) {
            var json = {
                "action": "com.elgato.wavelink.switchmonitoring", 
                "event": "sendToPropertyInspector", 
                "context": this.context, 
                "payload": { 
                    "AppIsConnected" : isConnected,
                    "WLIsUpToDate" : isUpToDate
                }
            };
        } else {
            var newMixerList = {};

            this.wlc.mixers.forEach(mixer => {
                newMixerList[mixer.channelPos] = [ mixer.name, mixer.mixerId, mixer.isLinked ];
            });

            var outputList = this.wlc.localOutputList;

            var json = {
                "action": "com.elgato.wavelink.switchmonitoring", 
                "event": "sendToPropertyInspector", 
                "context": this.context, 
                "payload": { 
                    newMixerList,
                    outputList
                }
            };
        }
        this.awl.sendToSD(json);
    };

    this.fixName = (name, maxlen = 8, suffix = '...') => {
        return (name && name.length > maxlen ? name.slice(0, maxlen - 1) + suffix : name);
    };

    this.listeners.push(
        this.wlc.on("UpdateKeys", state => {
            if (this.wlc.isConnected) {
                this.updateState();
            }
        })
    );

    if (this.typ == "ToggleMonitorMixOutput") {
        this.listeners.push(
            this.wlc.on("monitorMixChanged", state => {
                this.updateState();
             }
        )
        );
    };

    if (this.typ == "SwitchMonitoring") {
        this.listeners.push(
            this.wlc.on("switchStateChanged", state => {
                this.updateState();
             }
        )
        );
    };
    
    if(this.typ == "MixerMute") {
        this.listeners.push(
            this.wlc.on("inputMixerChanged", (mixerId) => {
                if(this.settings.mixId == mixerId || this.settings.channelPos == this.wlc.mixers.find(mixer => mixer.mixerId == mixerId).channelPos) {
                    this.updateState();
                }
            })
        );
    };

    if (this.typ == "MonitorMute") {
        this.listeners.push(
            this.wlc.on("outputMixerChanged", state => {
                this.updateState();
            })
        );
    }

    if (this.typ == "SetMicrophoneSettings") {
        this.listeners.push(
            this.wlc.on("micSettingsChanged", state => {
                this.updateImage();
            })
        );
    }

    this.listeners.push(
        this.wlc.on("UpdateImage", state => {
            this.updateImage();
        })
    );

    this.getMixId = (device) => {
        var mixerId = "";
        var isSDXL = false;

        // If the saved mixerID is available, return it. If not, look if the virtual device is a external Input
        if (this.UP_WINDOWS) {
            const mixerWin = this.wlc.mixers.find(mixer => this.settings.mixId == mixer.mixerId);
            if (mixerWin) {
                mixerId = mixerWin.mixerId;
            } else {
                const extInput = this.wlc.mixers.find(mixer => mixer.channelPos == this.settings.channelPos);
                
                if (extInput && extInput.inputType == 4) {
                    mixerId = extInput.mixerId;
                }
            }
        }

        // On mac, search for a saved mixerID first
        if(this.UP_MAC) {
            var isConfigured = this.settings.isConfigured;
            const mixerMac = this.wlc.mixers.find(mixer => this.settings.mixId == mixer.mixerId);
            if (mixerMac) {
                mixerId = mixerMac.mixerId;
            } else {
                // If no mixerID is found, get the Stream Deck type
                if (device) {
                    const deviceType = this.awl.devices.find(deviceType => deviceType.id == device)
                    if (deviceType.type == 2) {
                        isSDXL = true;
                    }
                }
                // For standard Stream Deck profile, put the apps in the right folder. 
                if (!isSDXL && !isConfigured) {
                    this.settings.isConfigured = true;

                    switch (parseInt(this.settings.channelPos)) {
                        case 1:
                            const mainMicrophone = this.wlc.mixers.find(mixer => mixer.inputType == 1);
                            this.settings.mixId = mixerId = mainMicrophone.mixerId;
                            //this.settings.bgColor = mainMicrophone.bgColor;
                            this.awl.saveSettings(this.uuid, this.context, this.settings);
                            break;
                        case 3:
                            const defaultMusicApps = [ "com.spotify.client", "com.apple.iTunes", "com.apple.Music" ];
                            this.settings.mixId = mixerId = this.findMacApp(defaultMusicApps);
                            this.awl.saveSettings(this.uuid, this.context, this.settings);
                            //var mixer = this.wlc.mixers.find(mixer => mixer.mixerId == mixerId);
                            //if (mixer) mixer.bgColor = '#FF00E8';
                            break;
                        case 4:
                            const defaultBrowserApps = [ "com.google.Chrome", "org.mozilla.firefox", "com.apple.Safari" ];
                            this.settings.mixId = mixerId = this.findMacApp(defaultBrowserApps);
                            this.awl.saveSettings(this.uuid, this.context, this.settings);
                            //var mixer = this.wlc.mixers.find(mixer => mixer.mixerId == mixerId);
                            //if (mixer) mixer.bgColor = '#B521FF';
                            break;
                        case 5:
                            const defaultVoiceChatApps = [ "com.hnc.Discord", "us.zoom.xos", "com.microsoft.teams", "com.skype.skype", "com.tinyspeck.slackmacgap" ];
                            this.settings.mixId = mixerId = this.findMacApp(defaultVoiceChatApps);
                            this.awl.saveSettings(this.uuid, this.context, this.settings);
                            //var mixer = this.wlc.mixers.find(mixer => mixer.mixerId == mixerId);
                            //if (mixer) mixer.bgColor = "#CFD924";
                            break;
                        case 6:
                            const defaultSFXApps = [ "com.elgato.StreamDeck" ];
                            this.settings.mixId = mixerId = this.findMacApp(defaultSFXApps);
                            this.awl.saveSettings(this.uuid, this.context, this.settings);
                            //var mixer = this.wlc.mixers.find(mixer => mixer.mixerId == mixerId);
                            //if (mixer) mixer.bgColor = "#FF6C3E";
                            break;
                        default:
                            break;
                    }
                } else {
                    // For Stream Deck XL, use the channel position to fill all space
                    const mixerMac = this.wlc.mixers.find(mixer => this.settings.channelPos == mixer.channelPos);
                    if (mixerMac && !isConfigured) {
                        this.settings.mixId = mixerId = mixerMac.mixerId;
                        this.settings.isConfigured = true;
                        this.awl.saveSettings(this.uuid, this.context, this.settings);                        
                        //mixerMac.bgColor = this.wlc.bgColors[this.settings.channelPos];
                    }
                }
            }
        }

        return mixerId;
    };

    this.fadeVolume = (fn, delay) => {

        var ms = 100;

        if (delay > 0) {
            setTimeout(() => { 
            this.fadeVolume(fn, delay - ms)
            fn();
            }, ms)   
        }
    }

    this.findMacApp = (apps) => {
        var mixerId = "";
        isFirstApp = false;
        apps.forEach(app => {
            const foundApp = this.wlc.mixers.find(mixer => mixer.mixerId == app);
            if (foundApp && !isFirstApp) {
                mixerId = app;
                this.settings.mixId = app;
                isFirstApp = true;
            }
        });
        return mixerId;
    }
}
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
function SwitchProfiles(inContext, inSettings, inDevice) {
    
    instance = this;
    this.typ = "SwitchProfiles";

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {
        {
            this.awl.switchProfile(this.settings.activeProfile, inDevice);
        }
    };

    this.onKeyUp = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {}

    this.updateState = () => {
        profile = this.settings.activeProfile;

        if (profile == "local") 
        {
            name = 'Channels\n\n\nMonitor';
        } 
        else if (profile == "stream")
        {
            name = 'Channels\n\n\nStream';
        }
        else if (profile == "outputs")
        {
            name = '\n\n\nOutputs';
        }
        //this.awl.setTitle(inContext, name); 
    }
  
    this.updateImage = () => {}

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.switchprofiles");
};

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
class WaveLinkClient {

    static instance;

    constructor(system) {
        if (WaveLinkClient.instance) {
            //debug("WLC Instance returned.");
            return WaveLinkClient.instance;
        }
        //debug("No WLC Instance found...");
        WaveLinkClient.instance = this;
        this.init(system);
    }
    
    init(system) {
        debug("Init WLC...");
        this.host = "127.0.0.1";

        this.startPort = 1824;
        this.endPort = this.startPort + 10;
        this.port = this.startPort;

        this.UP_MAC = system == 'mac' ? true : false; 
        this.UP_WINDOWS = system == 'windows' ? true : false;
        
        this.minimumBuild = this.UP_WINDOWS ? 2023 : 2196;
        this.isWLUpToDate = false;

        this.appIsRunning = false;
        this.isConnected = false;
        this.isKeyUpdated = false;

        this.event = ELGEvents.eventEmitter();
        this.on = this.event.on;
        this.emit = this.event.emit;

        this.awl = new AppWaveLink;
        this.rpc = new simple_jsonrpc();

        this.websocket = null;
        
        this.output = null;
        this.mixers = [];
        
        this.isMicrophoneConnected;
        this.micSettings;
        this.localOutputList;
        this.selectedMonitorMix;
        this.switchState;
        
        this.fadingDelay = 100;
    }

    tryToConnect() {
        if (this.appIsRunning) {
            debug("Trying to connect to port: " + this.port);
            this.websocket = new WebSocket("ws://" + this.host + ":" + this.port);
            this.websocket.rpc = this.rpc;

            this.websocket.onopen = () => {
                debug("Connection established");
                setTimeout(() => this.initRPC(), 200);
            };
            
            this.websocket.onerror = () => {
                debug("Connection Error");
                setTimeout(() => this.reconnect(), 100);
            };

            this.websocket.onmessage = function(evt) {
                if (typeof evt.data === 'string') {
                    debug("Incoming Message", JSON.parse(evt.data));

                } else {
                    debug("Incoming Message", typeof evt.data, evt.data);
                }

                this.rpc.messageHandler(evt.data);
            };
        }

    }

    initRPC() {
        this.rpc.toStream = (msg) => {
            try {
                debug("Sending: " + msg);
                this.websocket.send(msg);
            } catch (error) {
                debug("ERROR sending" + msg);
            }
        };

        // Setup
        this.rpc.on("microphoneStateChanged", ["isMicrophoneConnected"], (isMicrophoneConnected) => {
            this.isMicrophoneConnected = isMicrophoneConnected;
            this.getMicrophoneSettings();
            this.getMonitorMixOutputList();
        });

        this.rpc.on("microphoneSettingsChanged", 
        ["microphoneGain", "microphoneOutputVolume", "microphoneBalance", "isMicrophoneLowcutOn", "isMicrophoneClipguardOn"], 
        (microphoneGain, microphoneOutputVolume, microphoneBalance, isMicrophoneLowcutOn, isMicrophoneClipguardOn) => {
            var mic = {
                microphoneGain:             microphoneGain,
                microphoneOutputVolume:     microphoneOutputVolume,
                microphoneBalance:          microphoneBalance,
                isMicrophoneLowcutOn:       isMicrophoneLowcutOn,
                isMicrophoneClipguardOn:    isMicrophoneClipguardOn
                };
            this.micSettings = mic;
            this.emit('micSettingsChanged');
        });

        this.rpc.on("localMonitorOutputChanged", ["monitorMix"], (monitorMix) => {
            this.selectedMonitorMix = monitorMix;
            this.emit('monitorMixChanged');
        });


        this.rpc.on("monitorSwitchOutputChanged", ["switchState"], (switchState) => {
            this.switchState = switchState;
            this.emit('switchStateChanged', switchState);
        });

        this.rpc.on("outputMixerChanged", 
            ["localVolumeOut", "streamVolumeOut", "isLocalOutMuted", "isStreamOutMuted"], 
            (localVolumeOut, streamVolumeOut, isLocalOutMuted, isStreamOutMuted) => {
                this.output.localVolOut     = localVolumeOut;
                this.output.streamVolOut    = streamVolumeOut;
                this.output.isLocalMuteOut  = isLocalOutMuted;
                this.output.isStreamMuteOut = isStreamOutMuted;
                this.monitoringVolChanged();
            }
        );

        this.rpc.on("inputMixerChanged", 
            ["mixerName", "mixId", "bgColor", "isLinked", "deltaLinked", "localVolumeIn", "streamVolumeIn", "isLocalInMuted", "isStreamInMuted", "isAvailable"], 
            (mixerName, mixerId, bgColor, isLinked, deltaLinked, localVolumeIn, streamVolumeIn, isLocalInMuted, isStreamInMuted, isAvailable) => {
                this.mixers.forEach(mixer => {
                    if (mixer.mixerId == mixerId) {
                        mixer.name             = mixerName;
                        mixer.bgColor          = bgColor;
                        mixer.localVolIn       = localVolumeIn;
                        mixer.streamVolIn      = streamVolumeIn;
                        mixer.isLinked         = isLinked;
                        mixer.deltaLinked      = deltaLinked;
                        
                        mixer.isLocalMuteIn    = isLocalInMuted;
                        mixer.isStreamMuteIn   = isStreamInMuted;

                        mixer.isAvailable      = isAvailable;

                        if (mixer.deltaLinked > 0) {
                            mixer.topSlider = "local";
                        } 
                        else if (mixer.deltaLinked < 0) {
                            mixer.topSlider = "stream";
                        }
                        this.mixerVolChanged(mixerId);     
                    }
                });
            }
        );

        this.rpc.on("channelsChanged", 
        ["channels"], 
            (channels) => {
            this.setChannels(channels);
        }
    );
        this.getApplicationInfo();
    }

    // Method for preventing spamming "volumeChanged" and updateKey() delay
    monitoringVolChanged() {
        if (!this.isKeyUpdated) {
            this.emit("outputMixerChanged");
            this.isKeyUpdated = true;
            setTimeout(() => {
                this.isKeyUpdated = false;
                this.emit("outputMixerChanged");
            }, 100);
        }
    }    

    mixerVolChanged(pos) {
        if (!this.isKeyUpdated) {
            this.emit("inputMixerChanged", pos);
            this.isKeyUpdated = true;
            setTimeout(() => {
                this.isKeyUpdated = false;
                this.emit("inputMixerChanged", pos);
            }, 100);
        }
    }

    setMonitorMixOutput(mixOutput) {
        this.rpc.call("setMonitorMixOutput", {"monitorMix": mixOutput }).then(
            (result) => {
                this.selectedMonitorMix = result['monitorMix'];
                this.emit('monitorMixChanged');
        })
    };

    getSwitch() {
        return this.switchState;
    }

    changeSwitchState(state) {
        this.rpc.call("switchMonitoring", {"switchState": state}).then( 
            (result) => {
                this.switchState = result["switchState"];
                this.emit("switchStateChanged");
            }
        );
    };

    adjustMicGain(vol) {
        this.micSettings.microphoneGain += vol;
        this.setMicSettings();
    }

    setMicGain(vol) {
        this.micSettings.microphoneGain = vol;
        this.setMicSettings();
    }

    adjustMicOutputVolume(vol) {
        this.micSettings.microphoneOutputVolume += vol;
        this.setMicSettings();
    }

    setMicOutputVolume(vol) {
        this.micSettings.microphoneOutputVolume = vol;
        this.setMicSettings();
    }

    adjustMicBalance(vol) {
        this.micSettings.microphoneBalance += vol;
        this.setMicSettings();
    }

    setMicBalance(vol) {
        this.micSettings.microphoneBalance = vol;
        this.setMicSettings();
    }

    setLowcut() {
        this.micSettings.isMicrophoneLowcutOn = this.micSettings.isMicrophoneLowcutOn ? false : true;
        this.setMicSettings();
    }

    setClipguard() {
        this.micSettings.isMicrophoneClipguardOn = this.micSettings.isMicrophoneClipguardOn ? false : true;
        this.setMicSettings();
    }

    setMicSettings() {
        this.rpc.call("setMicrophoneSettings", 
        {
            "microphoneGain":           this.micSettings.microphoneGain,
            "microphoneOutputVolume":   this.micSettings.microphoneOutputVolume,
            "microphoneBalance":        this.micSettings.microphoneBalance,
            "isMicrophoneLowcutOn":     this.micSettings.isMicrophoneLowcutOn,
            "isMicrophoneClipguardOn":  this.micSettings.isMicrophoneClipguardOn
            }).then((result) => {
            this.micSettings.microphoneGain             = result["microphoneGain"];
            this.micSettings.microphoneOutputVolume     = result["microphoneOutputVolume"];
            this.micSettings.microphoneBalance          = result["microphoneBalance"];
            this.micSettings.isMicrophoneLowcutOn       = result["isMicrophoneLowcutOn"];
            this.micSettings.isMicrophoneClipguardOn    = result["isMicrophoneClipguardOn"];
            this.emit("micSettingsChanged");
            });
    }

    setMute(mixerTyp, mixerId, slider) {
        const mixer = mixerTyp == "input" ? this.getMixer(mixerId) : this.output;

        const localMute = mixerTyp == "input" ? mixer.isLocalMuteIn : mixer.isLocalMuteOut;
        const streamMute = mixerTyp == "input" ? mixer.isStreamMuteIn : mixer.isStreamMuteOut;
        
        const newLocalMute = slider == "local" ? localMute ? false : true : localMute;
        const newStreamMute = slider == "stream" ? streamMute ? false : true : streamMute;

        if (mixerTyp == "input") {
            mixer.isLocalMuteIn = newLocalMute;
            mixer.isStreamMuteIn = newStreamMute;
            this.setInputMixer(mixerId, slider);
        } else if (mixerTyp == "output") {
            mixer.isLocalMuteOut = newLocalMute;
            mixer.isStreamMuteOut = newStreamMute;
            this.setOutputMixer();
        }
    }

    adjustVolume(mixerTyp, mixerId, inSlider, vol) {
        // init vars based on the mixertyp
        var localVol,
            streamVol,
            deltaLinked,
            isLinked,
            slider = inSlider;

        if (mixerTyp == "input") {
            this.mixers.forEach(mixer => {
                if (mixer.mixerId == mixerId) {
                    localVol    = mixer.localVolIn;
                    streamVol   = mixer.streamVolIn;
                    deltaLinked = mixer.deltaLinked;
                    isLinked    = mixer.isLinked;
                }  
            });
        }
        else if (mixerTyp == "output") {
            localVol = this.output.localVolOut;
            streamVol = this.output.streamVolOut;
        }

        // adjust volume based on inputtyp
        if (slider == "local" && !isLinked) {
            localVol = localVol + vol;
        } 
        else if (slider == "stream" && !isLinked) {
            streamVol = streamVol + vol;
        } 
        else if (isLinked) {
            const topSlider = deltaLinked > 0 ? "stream" : "local";

            switch(vol > 0) {
                case (true):
                    if (topSlider == "local") {
                        localVol = localVol + vol;
                        slider = "local";
                    } else if (topSlider == "stream") {
                        streamVol = streamVol + vol;
                        slider = "stream";
                    }
                    break;
                case (false):
                    if (topSlider == "local") {
                        streamVol = streamVol + vol;
                        slider = "stream";
                    }
                    else if (topSlider == "stream") {
                        localVol = localVol + vol;
                        slider = "local";
                    }
                    break;           
                default:
                    break;
            }

        }
        // adjust volume based on the mixertyp
        if (mixerTyp == "input") {
            this.mixers.forEach(mixer => {
                if (mixer.mixerId == mixerId) {
                    mixer.localVolIn = localVol;
                    mixer.streamVolIn = streamVol;
                    this.setInputMixer(mixerId, slider);
                }
            });
        }
        else if (mixerTyp == "output") {
            this.output.localVolOut = localVol;
            this.output.streamVolOut = streamVol;
            this.setOutputMixer();
        }
    }

    setVolume(mixerTyp, mixerId, slider, targetVol, delay) {
        var timeLeft = delay;
        var volumeSteps = 0,
        localVol,
        streamVol,
        isNotBlocked = true;

        const mixer = this.getMixer(mixerId);

        var isNotBlocked = mixerTyp == "input" ? (slider == "local" ? mixer.isNotBlockedLocal : mixer.isNotBlockedStream) : (slider == "local" ? this.output.isNotBlockedLocal : this.output.isNotBlockedStream)

        if (isNotBlocked) {
            var intervalTimer = setInterval(() => { 
                localVol = mixerTyp == "input" ? mixer.localVolIn : mixerTyp == "output" ? this.output.localVolOut : NULL;
                streamVol = mixerTyp == "input" ? mixer.streamVolIn : mixerTyp == "output" ? this.output.streamVolOut : NULL;

                if (timeLeft > 0) {
                    if (slider == "local") {
                        volumeSteps = (targetVol - localVol) / (timeLeft / this.fadingDelay);
                        localVol +=  Math.round(volumeSteps, 2);
                        mixerTyp == "input" ? mixer.isNotBlockedLocal = false : this.output.isNotBlockedLocal = false;
                    } else if (slider == "stream") {
                        volumeSteps = (targetVol - streamVol) / (timeLeft / this.fadingDelay);
                        streamVol += Math.round(volumeSteps, 2);
                        mixerTyp == "input" ? mixer.isNotBlockedStream = false  : this.output.isNotBlockedStream = false;
                    }
                    timeLeft -= this.fadingDelay;
                } else {
                    localVol = slider == "local" ? targetVol : localVol;
                    streamVol = slider == "stream" ? targetVol : streamVol;
                    
                    if (mixer) {
                        slider == "local" ? mixer.isNotBlockedLocal = true : mixer.isNotBlockedStream = true;
                    } else {
                        slider == "local" ? this.output.isNotBlockedLocal = true : this.output.isNotBlockedStream = true;
                    }   
                    clearInterval(intervalTimer);
                }

                if (localVol != null && streamVol != null) {
                    if (mixerTyp == "input") {
                        mixer.localVolIn = localVol;
                        mixer.streamVolIn = streamVol;
                        this.setInputMixer(mixerId, slider);
                    } else if (mixerTyp == "output") {
                        this.output.localVolOut = localVol;
                        this.output.streamVolOut = streamVol; 
                        this.setOutputMixer();
                    }
                }
            }, this.fadingDelay)
        } 
    }
 
    setInputMixer(mixId, slider) {
        this.mixers.forEach(mixer => {
            if (mixer.mixerId == mixId) {
                var mixerId     = mixer.mixerId,
                    localVol    = mixer.localVolIn,
                    localMute   = mixer.isLocalMuteIn,
                    streamVol   = mixer.streamVolIn,
                    streamMute  = mixer.isStreamMuteIn,
                    isLinked    = mixer.isLinked;
                
                this.rpc.call("setInputMixer", {
                    "mixId": mixerId,
                    "slider": slider,
                    "isLinked": isLinked,
                    "localVolumeIn": localVol,
                    "isLocalInMuted": localMute,
                    "streamVolumeIn": streamVol,
                    "isStreamInMuted": streamMute
                }).then((result) => {
                    mixer.isAvailable      = result["isAvailable"];
                    mixer.isLinked         = result["isLinked"];
                    mixer.deltaLinked      = result["deltaLinked"]
                    mixer.localVolIn       = result["localVolumeIn"];
                    mixer.isLocalMuteIn    = result["isLocalInMuted"];
                    mixer.streamVolIn      = result["streamVolumeIn"];
                    mixer.isStreamMuteIn   = result["isStreamInMuted"];
                    this.emit("inputMixerChanged", mixerId);
                    });
            }
        });
    }

    setOutputMixer() {
        var localVol = this.output.localVolOut,
            localMute = this.output.isLocalMuteOut,
            streamVol = this.output.streamVolOut,
            streamMute = this.output.isStreamMuteOut;

        this.rpc.call("setOutputMixer", {
            "localVolumeOut": localVol,
            "isLocalOutMuted": localMute,
            "streamVolumeOut": streamVol,
            "isStreamOutMuted": streamMute
        }).then((result) => {
            this.output.localVolOut = result["localVolumeOut"];
            this.output.isLocalMuteOut  = result["isLocalOutMuted"];
            this.output.streamVolOut = result["streamVolumeOut"];
            this.output.isStreamMuteOut = result["isStreamOutMuted"];
            this.emit("outputMixerChanged");
            });
    }

    // Request

    getApplicationInfo() {
        this.rpc.call('getApplicationInfo').then((result) => {
            if (result || result == undefined) {
                if (result['appName'] == 'Elgato Wave Link') {
                    debug('Wave Link WebSocketServer found.');

                    var versionNumber = result['version'];

                    if ( /*versionNumber.includes("(") && */(this.minimumBuild <= parseInt(versionNumber.match(/\((.*)\)/).pop())) ) {
                        debug("Minimum WL version or above found.");
                        this.getMicrophoneState();
                        this.getMicrophoneSettings();
                        this.getMonitorMixOutputList();
                        this.getSwitchState();
                        this.getMonitoringState();
                        this.getMixers();
                        this.isConnected = true;
                        this.isWLUpToDate = true;
                    } else {
                        debug("Please update WL-Version");
                        this.isConnected = true;
                        this.isWLUpToDate = false;
                        this.awl.updatePI();
                    }
                } else {
                    debug("Wrong WebSocketServer found.");
                }
            }
        });

        setTimeout(() => {
            if (!this.isConnected && this.isWLUpToDate) {
                this.reconnect();
            }     
        }, 200);
    }

    getMixers() {
        this.rpc.call("getAllChannelInfo").then((result) => {
            this.setChannels(result);
        });
    }

    getMicrophoneState() {
        this.rpc.call("getMicrophoneState").then(
            (result) => {
                this.isMicrophoneConnected = result["isMicrophoneConnected"];
            }
        );
    }

    getMicrophoneSettings() {
        this.rpc.call("getMicrophoneSettings").then(
            (result) => {
                var mic = {
                    microphoneGain:             result["microphoneGain"],
                    microphoneOutputVolume:     result["microphoneOutputVolume"],
                    microphoneBalance:          result["microphoneBalance"],
                    isMicrophoneLowcutOn:       result["isMicrophoneLowcutOn"],
                    isMicrophoneClipguardOn:    result["isMicrophoneClipguardOn"]
                };
                this.micSettings = mic;
                this.emit('micSettingsChanged');
            }
        );
    }

    getMonitoringState() {
        this.rpc.call("getMonitoringState").then(
            (result) => {
                this.output = {
                    localVolOut: result["localVolumeOut"],
                    streamVolOut: result["streamVolumeOut"],
                    isLocalMuteOut: result["isLocalOutMuted"],
                    isStreamMuteOut: result["isStreamOutMuted"],
                    isNotBlockedLocal: true,
                    isNotBlockedStream: true
                }
                this.emit("monitoringChanged");
            }
        );
    }

    getMonitorMixOutputList() {
        this.rpc.call("getMonitorMixOutputList").then(
            (result) => {
                this.localOutputList = Object.values(result['monitorMixList']).map(e => {
                    var out = {
                        value: e.monitorMix,
                        name: this.fixNames(e.monitorMix)
                    }

                    return out;
                });

                this.selectedMonitorMix = result['monitorMix'];
            }
        );
    }

    getSwitchState() {
        this.rpc.call("getSwitchState").then(
            (result) => {
                this.switchState = result["switchState"];
            }
        );
    }

    // Getter & Setter:

    getOutputMixer() {
        return this.output;
    }


    getMixerList() {
        return this.mixers;
    }

    setChannels(channels) {
        
        if (channels) {
            var i = 1;
            this.mixers = Object.values(channels).map(e => {

                switch (e.mixId) {
                    case 'pcm_in_01_c_00_sd1':
                        var muteLocalWL = 'Wave Local Mute';
                        var unmuteLocalWL = 'Wave Local';
                        var muteStreamWL = 'Wave Stream Mute';
                        var unmuteStreamWL = 'Wave Stream';
                        var muteBothWL = 'Wave Mute';
                        var unmuteBothWL = 'Wave';
                        break;
                    case 'pcm_out_01_v_00_sd2':
                        var muteLocalWL = 'System Local Mute';
                        var unmuteLocalWL = 'System Local';
                        var muteStreamWL = 'System Stream Mute';
                        var unmuteStreamWL = 'System Stream';
                        var muteBothWL = 'System Mute';
                        var unmuteBothWL = 'System';
                        break;
                    case 'pcm_out_01_v_02_sd3':
                        var muteLocalWL = 'Music Local Mute';
                        var unmuteLocalWL = 'Music Local';
                        var muteStreamWL = 'Music Stream Mute';
                        var unmuteStreamWL = 'Music Stream';
                        var muteBothWL = 'Music Mute';
                        var unmuteBothWL = 'Music';
                        break;
                    case 'pcm_out_01_v_04_sd4':
                        var muteLocalWL = 'Browser Local Mute';
                        var unmuteLocalWL = 'Browser Local';
                        var muteStreamWL = 'Browser Stream Mute';
                        var unmuteStreamWL = 'Browser Stream';
                        var muteBothWL = 'Browser Mute';
                        var unmuteBothWL = 'Browser';
                        break;
                    case 'pcm_out_01_v_06_sd5':
                        var muteLocalWL = 'Voice Chat Local Mute';
                        var unmuteLocalWL = 'Voice Chat Local';
                        var muteStreamWL = 'Voice Chat Stream Mute';
                        var unmuteStreamWL = 'Voice Chat Stream';
                        var muteBothWL = 'Voice Chat Mute';
                        var unmuteBothWL = 'Voice Chat';
                        break;
                    case 'pcm_out_01_v_08_sd6':
                        var muteLocalWL = 'SFX Local Mute';
                        var unmuteLocalWL = 'SFX Local';
                        var muteStreamWL = 'SFX Stream Mute';
                        var unmuteStreamWL = 'SFX Stream';
                        var muteBothWL = 'SFX Mute';
                        var unmuteBothWL = 'SFX';
                        break;
                    case 'pcm_out_01_v_10_sd7':
                        var muteLocalWL = 'Game Local Mute';
                        var unmuteLocalWL = 'Game Local';
                        var muteStreamWL = 'Game Stream Mute';
                        var unmuteStreamWL = 'Game Stream';
                        var muteBothWL = 'Game Mute';
                        var unmuteBothWL = 'Game';
                        break;
                    case 'pcm_out_01_v_12_sd8':
                        var muteLocalWL = 'AUX Local Mute';
                        var unmuteLocalWL = 'AUX Local';
                        var muteStreamWL = 'AUX Stream Mute';
                        var unmuteStreamWL = 'AUX Stream';
                        var muteBothWL = 'AUX Mute';
                        var unmuteBothWL = 'AUX';
                        break;
                    case 'pcm_out_01_v_14_sd9':
                        var muteLocalWL = 'AUX Local Mute';
                        var unmuteLocalWL = 'AUX Local';
                        var muteStreamWL = 'AUX Stream Mute';
                        var unmuteStreamWL = 'AUX Stream';
                        var muteBothWL = 'AUX Mute';
                        var unmuteBothWL = 'AUX';
                        break;
                    default:
                        if (e.inputType == 4) {
                            var muteLocalWL = 'AUX Local Mute';
                            var unmuteLocalWL = 'AUX Local';
                            var muteStreamWL = 'AUX Stream Mute';
                            var unmuteStreamWL = 'AUX Stream';
                            var muteBothWL = 'AUX Mute';
                            var unmuteBothWL = 'AUX';
                        } else if (e.inputType == 1) {
                            var muteLocalWL = 'Wave Local Mute';
                            var unmuteLocalWL = 'Wave Local';
                            var muteStreamWL = 'Wave Stream Mute';
                            var unmuteStreamWL = 'Wave Stream';
                            var muteBothWL = 'Wave Mute';
                            var unmuteBothWL = 'Wave';
                        }
                        break;
                }
                
                var mix = {
                    channelPos: i++,
                    mixerId: e.mixId,
                    name: this.fixNames(e.mixerName),
                    inputType: e.inputType,
                    localVolIn: e.localVolumeIn,
                    streamVolIn: e.streamVolumeIn,
                    isLinked: e.isLinked,
                    deltaLinked: e.deltaLinked,
                    isLocalMuteIn: e.isLocalInMuted,
                    isStreamMuteIn: e.isStreamInMuted,
                    isAvailable: e.isAvailable,
                    isNotBlockedLocal: true,
                    isNotBlockedStream: true,
                    bgColor: e.bgColor,
                    iconMuteLocal: muteLocalWL,
                    iconUnmuteLocal: unmuteLocalWL,
                    iconMuteStream: muteStreamWL,
                    iconUnmuteStream: unmuteStreamWL,
                    iconMuteBoth: muteBothWL,
                    iconUnmuteBoth: unmuteBothWL,
                    iconData: e.iconData
                };

                    return mix;
                }
            );

            this.emit("UpdateImage");
            this.emit("UpdateKeys");
            this.awl.updatePI();
        }
    }

    getMixer(mixerId) {
		return this.mixers.find(mixer => mixer.mixerId == mixerId);// || { isAvailable: false };
    }

    // Helper methods

    fixNames = (name, maxlen = 27, suffix = ' &hellip;') => { 
        return (name && name.length > maxlen ? name.slice(0, maxlen - 1) + suffix : name);
    };
    setConnectState(state) {
        this.isConnected = state;
    }
    setAppIsRunning(state) {
        this.appIsRunning = state;
    }

    reconnect() {
        debug("Connecting failed.");        
        if (this.port < this.endPort) {
            this.port = this.port + 1;  
        } 
        else {
            this.port = this.startPort;
        }
    this.tryToConnect();
    }

    // Taken from common.js (Control Center), adjusted to fit
    loadImage (inUrl, inCanvas, inFillcolor = '#1B0371') {

        return new Promise((resolve, reject) => {
            /** Convert to array, so we may load multiple images at once */
            const aUrl = !Array.isArray(inUrl) ? [inUrl] : inUrl;
            const canvas = inCanvas && inCanvas instanceof HTMLCanvasElement ? inCanvas : document.createElement('canvas');
            var imgCount = aUrl.length - 1;
            const imgCache = {};

            var ctx = canvas.getContext('2d');
            ctx.globalCompositeOperation = 'source-over';
        
            for (let url of aUrl) {
                let image = new Image();
                let cnt = imgCount;
                let w = 144, h = 144;
                let resize = 30;
        
                image.onload = function() {
                    imgCache[url] = this;
                    // look at the size of the second image
                    //if (url === aUrl[0]) {
                        canvas.width = w; //this.naturalWidth; // or 'width' if you want a special/scaled size
                        canvas.height = h; //this.naturalHeight; // or 'height' if you want a special/scaled size
                    //}
                    // if (Object.keys(imgCache).length == aUrl.length) {
                    if (cnt < 1) {
                        if (inFillcolor) {
                            ctx.fillStyle = inFillcolor;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                        // draw in the proper sequence FIFO
                        aUrl.forEach(e => {
                            if (!imgCache[e]) {
                                debug(imgCache[e], imgCache);
                                reject('error');
                            }
                            if (e == aUrl[0]) {
                                if (imgCache[e]) {
                                    ctx.drawImage(imgCache[e], 0 + (resize / 2), 0 +  (resize / 2), w - resize, h - resize);
                                    ctx.save();
                                }
                            } else {
                                if (imgCache[e]) {
                                    ctx.drawImage(imgCache[e], 0, 0, w, h);
                                    ctx.save();
                                }
                            }
                        });
        
                        //callback(canvas.toDataURL('image/png'));
                        var img = canvas.toDataURL('image/png');
                        resolve(img);
                        // or to get raw image data
                        // callback && callback(canvas.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, ''));
                    }
                };
                
                imgCount--;
                image.src = url;
            }
        });
            
    };

};
let debugMode = true;

function debug(...args) {
  if (debugMode) console.log(...args);
}

class AppWaveLink {
  updatePI() {}
}

import Worker from "tiny-worker";
import Blob from "cross-blob";
import URL from "url";

import simple_jsonrpc from "simple-jsonrpc-js";

import ws from "websocket";
const WebSocket = ws.w3cwebsocket;

export { WaveLinkClient };
