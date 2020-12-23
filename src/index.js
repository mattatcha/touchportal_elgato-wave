import TouchPortalAPI from "touchportal-api";
import { WaveLinkClient } from "./lib.js";

const wlc = new WaveLinkClient("windows");

wlc.setAppIsRunning(true);
wlc.tryToConnect();

const TPClient = new TouchPortalAPI.Client();

const pluginId = "TPElgatoWaveLink";

wlc.on("UpdateKeys", () => {
  console.log("UPDATE KEYS");
  const names = wlc.mixers.map((mixer) => mixer.name);
  TPClient.choiceUpdate("wavelink_input", names);
});

wlc.on("switchStateChanged", (state) => {
  console.log("switchStateChanged", state, wlc.switchState);
  const switchState = state.replace(/([A-Z])/g, " $1").trim();

  TPClient.stateUpdate("wavelink_listen_mix", switchState);
});

wlc.on("monitorMixChanged", () => {
  console.log("monitorMixChanged", wlc.selectedMonitorMix);
});

wlc.on("outputMixerChanged", () => {
  console.log("outputMixerChanged", wlc.output);
});

wlc.on("inputMixerChanged", (mixerId) => {
  console.log("inputMixerChanged", "mixerId", mixerId, wlc.mixers);
  const mixer = wlc.getMixer(mixerId);
  let { bgColor } = mixer;
  if (bgColor.length != 9) {
    bgColor = bgColor.replace("#", "#FF");
  }

  TPClient.stateUpdateMany([
    {
      id: `wavelink_channel_${mixer.channelPos}_bgColor`,
      value: bgColor.toUpperCase(),
    },
    {
      id: `wavelink_channel_${mixer.channelPos}_available`,
      value: mixer.isAvailable.toString(),
    },
    {
      id: `wavelink_channel_${mixer.channelPos}_linked_delta`,
      value: mixer.deltaLinked.toString(),
    },
    {
      id: `wavelink_channel_${mixer.channelPos}_linked`,
      value: mixer.isLinked.toString(),
    },
    {
      id: `wavelink_channel_${mixer.channelPos}_local_muted`,
      value: mixer.isLocalMuteIn.toString(),
    },
    {
      id: `wavelink_channel_${mixer.channelPos}_stream_muted`,
      value: mixer.isStreamMuteIn.toString(),
    },
    {
      id: `wavelink_channel_${mixer.channelPos}_stream_volume`,
      value: mixer.streamVolIn.toString(),
    },
    {
      id: `wavelink_channel_${mixer.channelPos}_local_volume`,
      value: mixer.localVolIn.toString(),
    },
    {
      id: `wavelink_channel_${mixer.channelPos}_name`,
      value: mixer.name,
    },
    {
      id: `wavelink_channel_${mixer.channelPos}_mixer_id`,
      value: mixer.mixerId,
    },
  ]);
});

wlc.on("micSettingsChanged", () => {
  console.log("micSettingsChanged", wlc.micSettings);
  const states = [
    {
      id: "wavelink_mic_clipguard",
      value: wlc.micSettings["isMicrophoneClipguardOn"].toString(),
    },
    {
      id: "wavelink_mic_lowcut",
      value: wlc.micSettings["isMicrophoneLowcutOn"].toString(),
    },
    {
      id: "wavelink_mic_balance",
      value: wlc.micSettings["microphoneBalance"].toString(),
    },
    {
      id: "wavelink_mic_gain",
      value: wlc.micSettings["microphoneGain"].toString(),
    },
    {
      id: "wavelink_mic_output_volume",
      value: wlc.micSettings["microphoneOutputVolume"].toString(),
    },
  ];
  TPClient.stateUpdateMany(states);
});

const getMixerByName = (name) => {
  return wlc.mixers.find((mixer) => mixer.name == name);
};

TPClient.on("Action", (data) => {
  console.log(data);

  const actionData = data.data.reduce(
    (obj, item) => ((obj[item.id] = item.value), obj),
    {}
  );

  switch (data.actionId) {
    case "com.elgato.wavelink.mixermute":
      var { mixerId } = getMixerByName(actionData["wavelink_input"]); // check for an actual value
      var output = actionData["wavelink_output"];
      wlc.setMute("input", mixerId, output);
      break;
    case "com.elgato.wavelink.setvolumemixer":
      var { mixerId } = getMixerByName(actionData["wavelink_input"]); // check for an actual value
      var {
        wavelink_output: output,
        wavelink_volume: volume,
        delay,
      } = actionData;
      wlc.setVolume(
        "input",
        mixerId,
        output,
        parseInt(volume),
        parseInt(delay)
      );
      break;

    case "com.elgato.wavelink.adjustvolumemixer":
      var { mixerId } = getMixerByName(actionData["wavelink_input"]); // check for an actual value
      var { wavelink_output: output, wavelink_volume: level } = actionData;
      wlc.adjustVolume("input", mixerId, output, parseInt(level));
      break;
    default:
      console.log("unhandled action", data.actionId);
      break;
  }
});

TPClient.on("ListChange", (data) => {
  console.log(pluginId, ": DEBUG : ListChange :" + JSON.stringify(data));
});

TPClient.on("Info", (data) => {
  console.log(pluginId, ": DEBUG : Info :" + JSON.stringify(data));
});

TPClient.connect({ pluginId });
