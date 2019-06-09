// Types
type PubSubChannelFn = (payload: any) => any;

interface IPubSubPayload {
  action: string;
  data: any;
}

interface IPubSubChannel {
  [channelName: string]: PubSubChannelFn[];
}

interface IPubSub {
  init?: {};
}

interface IPubSubReturn {
  chs(): string[];
  pub(channel: string, payload: any): void;
  sub(channel: string, pubFn: PubSubChannelFn): void;
}


/**
 * Simple Pub/Sub bus for state and event changes.
 * @param {object} init -> init object with a set of channels
 * 
 * @return {object} => Contains functions to interact with channels
 */
function pubsub(init?: IPubSub): IPubSubReturn {
  const channels: any = init || {};

  // Lists channels
  function chs() {
    return Object.keys(channels).map(chan => chan);
  }

  // Publish to a channel
  function pub(channel = "/", payload: IPubSubPayload) {
    if (!channels[channel]) {
      // throw new Error(`Specified channel: ${channel}, does not exist`);
      channels[channel] = [];
    }

    channels[channel].forEach(( ch: any ) => {
      ch(payload);
    });
  }

  // Sub to a channel
  function sub(channel = "/", pubFn: PubSubChannelFn) {
    if (!pubFn || typeof pubFn !== "function") {
      throw new Error("Event listener for a subscriber cannot be null");
    }

    // Register the function to the correct channel
    if (!channels[channel]) {
      channels[channel] = [];
    }
    channels[channel].push(pubFn);
  }

  return {
    chs,
    pub,
    sub
  };
}

export default pubsub;
