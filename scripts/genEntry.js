let states = [
  {
    id: "wavelink_input",
    type: "choice",
    label: "Input",
    default: "",
    valueChoices: [],
  },
  {
    id: "wavelink_listen_mix",
    type: "text",
    desc: "Wave Link Listen Mix",
    default: "Local Mix",
    valueChoices: ["Local Mix", "Stream Mix"],
  },
  {
    id: "wavelink_monitor_mix",
    type: "text",
    desc: "Wave Link Toggle Listen Mix",
    default: "",
  },
  {
    id: "wavelink_mic_clipguard",
    type: "text",
    desc: "Wave Link Mic Clip Guard",
    default: "",
  },
  {
    id: "wavelink_mic_lowcut",
    type: "text",
    desc: "Wave Link Mic Lowcut",
    default: "",
  },
  {
    id: "wavelink_mic_balance",
    type: "text",
    desc: "Wave Link Mic Balance",
    default: "",
  },
  {
    id: "wavelink_mic_gain",
    type: "text",
    desc: "Wave Link Mic Gain",
    default: "",
  },
  {
    id: "wavelink_mic_output_volume",
    type: "text",
    desc: "Wave Link Mic Output Volume",
    default: "",
  },
];

let events = [];

const channelState = (number) => {
  return [
    {
      id: `wavelink_channel_${number}_name`,
      type: "text",
      desc: `Wave Link: Channel ${number} Name`,
      default: "",
    },
    {
      id: `wavelink_channel_${number}_mixer_id`,
      type: "text",
      desc: `Wave Link: Channel ${number} Mixer ID`,
      default: "",
    },
    {
      id: `wavelink_channel_${number}_bgColor`,
      type: "text",
      desc: `Wave Link: Channel ${number} Background Color`,
      default: "",
    },
    {
      id: `wavelink_channel_${number}_available`,
      type: "text",
      desc: `Wave Link: Channel ${number} Availability`,
      default: "",
    },
    {
      id: `wavelink_channel_${number}_linked`,
      type: "text",
      desc: `Wave Link: Channel ${number} Linked`,
      default: "",
    },
    {
      id: `wavelink_channel_${number}_linked_delta`,
      type: "text",
      desc: `Wave Link: Channel ${number} Linked Delta`,
      default: "",
    },
    {
      id: `wavelink_channel_${number}_local_muted`,
      type: "text",
      desc: `Wave Link: Channel ${number} Local Muted`,
      default: "",
    },
    {
      id: `wavelink_channel_${number}_stream_muted`,
      type: "text",
      desc: `Wave Link: Channel ${number} Stream Muted`,
      default: "",
    },
    {
      id: `wavelink_channel_${number}_stream_volume`,
      type: "text",
      desc: `Wave Link: Channel ${number} Stream Volume`,
      default: "",
    },
    {
      id: `wavelink_channel_${number}_local_volume`,
      type: "text",
      desc: `Wave Link: Channel ${number} Local Volume`,
      default: "",
    },
  ];
};

const channelEvent = (number) => {
  return [
    {
      id: `wavelink_channel_${number}_linked_event`,
      name: `Ch ${number}: Link State`,
      format: `When channel ${number} Linked Status is $val`,
      type: "communicate",
      valueType: "choice",
      valueChoices: ["true", "false"],
      valueStateId: `wavelink_channel_${number}_linked`,
    },
    {
      id: `wavelink_channel_${number}_local_muted_event`,
      name: `Ch ${number}: Local Mute State`,
      format: `Ch ${number}: Local Mute State is $val`,
      type: "communicate",
      valueType: "choice",
      valueChoices: ["true", "false"],
      valueStateId: `wavelink_channel_${number}_local_muted`,
    },
    {
      id: `wavelink_channel_${number}_stream_muted_event`,
      name: `Ch ${number}: Stream Mute State`,
      format: `Ch ${number}: Stream Mute State is $val`,
      type: "communicate",
      valueType: "choice",
      valueChoices: ["true", "false"],
      valueStateId: `wavelink_channel_${number}_stream_muted`,
    },
  ];
};

let entry = {
  sdk: 2,
  version: 0,
  TPElgatoWaveLink_Version: "0.1.0",
  name: "Touch Portal Elgato Wave Plugin",
  id: "TPElgatoWaveLink",
  plugin_start_cmd:
    '"%TP_PLUGIN_FOLDER%TPElgatoWaveLink\\tpelgatowavelink.exe"',
  configuration: {
    colorDark: "#225834",
    colorLight: "#45b168",
  },
  categories: [
    {
      id: "TPElgatoWaveLink",
      name: "ElgatoWaveLink",
      imagepath:
        "%TP_PLUGIN_FOLDER%TPElgatoWaveLink/ElgatoWaveLink-Logo-White.png",
      actions: [
        {
          id: "com.elgato.wavelink.mixermute",
          prefix: "WaveLink:",
          name: "Toggle Mute Input",
          type: "communicate",
          description: "Mute/unmute input",
          tryInline: "true",
          format: "Mute Input: {$wavelink_input$} on {$wavelink_output$}",
          data: [
            {
              id: "wavelink_input",
              type: "choice",
              label: "Input",
              default: "",
              valueChoices: [],
            },
            {
              id: "wavelink_output",
              type: "choice",
              label: "Output",
              default: "",
              valueChoices: ["local", "stream"],
            },
          ],
        },
        {
          id: "com.elgato.wavelink.setvolumemixer",
          prefix: "WaveLink:",
          name: "Set Volume",
          type: "communicate",
          description: "Set volume for mixer channel",
          tryInline: "true",
          format:
            "Set channel: {$wavelink_input$} {$wavelink_output$} volume to: {$wavelink_volume$} fade over {$wavelink_volume_delay$}",
          data: [
            {
              id: "wavelink_input",
              type: "choice",
              label: "Input",
              default: "",
              valueChoices: [],
            },
            {
              id: "wavelink_output",
              type: "choice",
              label: "Output",
              default: "",
              valueChoices: ["local", "stream"],
            },
            {
              id: "wavelink_volume",
              type: "text",
              label: "Output",
              default: "",
            },
            {
              id: "wavelink_volume_delay",
              type: "text",
              label: "Duration",
              default: "0",
            },
          ],
        },
        {
          id: "com.elgato.wavelink.adjustvolumemixer",
          prefix: "WaveLink:",
          name: "Adjust Mixer Channel Volume",
          type: "communicate",
          description: "Increase/Decrease volume for mixer channel",
          tryInline: "true",
          format:
            "Adjust mixer {$wavelink_input$} channel {$wavelink_output$} volume by: {$wavelink_volume$}",
          data: [
            {
              id: "wavelink_input",
              type: "choice",
              label: "Input",
              default: "",
              valueChoices: [],
            },
            {
              id: "wavelink_output",
              type: "choice",
              label: "Output",
              default: "",
              valueChoices: ["local", "stream"],
            },
            {
              id: "wavelink_volume",
              type: "text",
              label: "Output",
              default: "10",
            },
          ],
        },
      ],

      states: [...states],
      events: [...events],
    },
  ],
};

Array(8)
  .fill()
  .map((item, i) => {
    entry.categories[0].states.push(...channelState(i + 1));
    entry.categories[0].events.push(...channelEvent(i + 1));
  });

console.log(JSON.stringify(entry, null, 2));
