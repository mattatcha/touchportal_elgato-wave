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
