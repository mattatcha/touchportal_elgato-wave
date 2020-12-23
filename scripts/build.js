import AdmZip from "adm-zip";
import path from "path";
import fs from "fs";

function concat(opts) {
  var fileList = opts.src;
  var distPath = opts.dest;
  var out = fileList.map(function (filePath) {
    return fs.readFileSync(filePath).toString();
  });
  fs.writeFileSync(distPath, out.join("\n"));
  console.log(" " + distPath + " built.");
}

concat({
  src: [
    "lib/wavelink/ELGEvents.js",
    "lib/wavelink/WaveLinkAction.js",
    "lib/wavelink/SetMonitorMixOutput.js",
    "lib/wavelink/ToggleMonitorMixOutput.js",
    "lib/wavelink/SwitchMonitoring.js",
    "lib/wavelink/SwitchProfile.js",
    "lib/wavelink/AdjustVolumeMixer.js",
    "lib/wavelink/SetVolumeMixer.js",
    "lib/wavelink/AdjustVolumeMonitor.js",
    "lib/wavelink/SetVolumeMonitor.js",
    "lib/wavelink/MixerMute.js",
    "lib/wavelink/MonitorMute.js",
    "lib/wavelink/SetMicrophoneSettings.js",
    "lib/wavelink/WaveLinkClient.js",
    "lib/wavelink/index.js",
  ],
  dest: "src/bundle.js",
});

const zip = new AdmZip();
zip.addLocalFolder(
  path.normalize("./base/Win/TPElgatoWaveLink"),
  "TPElgatoWaveLink"
);

zip.writeZip(path.normalize("./base/Win/TPElgatoWaveLink.tpp"));
