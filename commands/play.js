const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

const queue = new Map();

const { joinVoiceChannel, NoSubscriberBehavior } = require('@discordjs/voice');
const { createAudioPlayer } = require('@discordjs/voice');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { createAudioResource } = require('@discordjs/voice');

module.exports = {
    name: 'play',
    cooldown: 0,
    description: 'Makes the bot join the voice channel and play the requested song',
    async execute(message, args){
        const voiceChannel = message.member.voice.channel;
        global.player = await createAudioPlayer({ behaviors: { maxMissedFrames: 25 } });
        global.connection;
        global.queueConstructor;

        if (!voiceChannel) return message.reply(':loud_sound: You need to be in a voice channel to execute this command');
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('CONNECT')) return message.reply(':lock: You dont have the correct permissions');
        if (!permissions.has('SPEAK')) return message.reply(':lock: You dont have the correct permissions');

        const serverQueue = queue.get(message.guild.id);
        
        if (message.content.split(' ')[0].substring(1) === 'play')
        {
            if (!args.length) return message.reply(':no_entry: You need to send the second argument');
            let song = {};

            if (ytdl.validateURL(args[0]))
            {
                const songInfo = await ytdl.getInfo(args[0]);
                song = { title: songInfo.videoDetails.title, url: songInfo.videoDetails.video_url}
            }
            else
            {
                const videoFinder = async (query) => {
                    const videoResult = await ytSearch(query);
                    return (videoResult.videos.length > 1) ? videoResult.videos[0] : null;
                }

                const video = await videoFinder(args.join(' '));
                if (video)
                {
                    song = { title: video.title, url: video.url }
                }
                else
                {
                    message.reply(':thumbsdown: ***Error finding video***');
                }
            }

            if (!serverQueue)
            {
                queueConstructor = {
                    voice_channel: voiceChannel,
                    text_channel: message.channel,
                    connection: null,
                    songs: []
                }

                queue.set(message.guild.id, queueConstructor);
                queueConstructor.songs.push(song);

                try
                {
                    connection = await joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: voiceChannel.guild.id,
                        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                    });
                    queueConstructor.connection = connection;
                    videoPlayer(message.guild, queueConstructor.songs[0], message, serverQueue);
                }
                catch (err)
                {
                    queue.delete(message.guild.id);
                    message.reply('There was an error connecting');
                    throw err;
                }
            }
            else
            {
                serverQueue.songs.push(song);
                return message.reply(`:thumbsup: **${song.title}** added to queue!`);
            }
        }
        else if (message.content.split(' ')[0].substring(1) === 'skip')
        {
            skipSong(message, serverQueue);
        }
        else if (message.content.split(' ')[0].substring(1) === 'stop')
        {
            stopSong(message);
        }
    }
}

const videoPlayer = async (guild, song, message, serverQueue) => {
    const songQueue = queue.get(guild.id);

    if (!song)
    {
        await songQueue.connection.destroy();
        queue.delete(guild.id);
        return;
    }
    const stream = ytdl(song.url, {filter: 'audioonly'});

    const resource = await createAudioResource(stream);
    player.play(resource);
    const subscription = songQueue.connection.subscribe(player);

    player.on('error', error => {
        //console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
        try
        {
            subscription.unsubscribe();
            resource = createAudioResource(stream)
            player.play();
            subscription = songQueue.connection.subscribe(player);
        }
        catch (err)
        {
            skipSong(message, serverQueue);
            console.log(err);
            message.channel.send('Jaskier encountered an error and could only resolve it by skipping the to next song');
        }
    });

    player.on(AudioPlayerStatus.Idle, () => {
        songQueue.songs.shift();
        videoPlayer(guild, songQueue.songs[0], message, serverQueue);
    });

    //await songQueue.text_channel.send(`:notes: Now playing **${song.title}**`)
    await message.reply(`:notes: Now playing **${song.title}**`)
}

const skipSong = (message, serverQueue) => {
    if (!message.member.voice.channel) return message.reply('You need to be in a channel to use this command');

    if (!serverQueue)
    {
        return message.reply('There are no songs in the queue to skip')
    }
    serverQueue.songs.shift();
    videoPlayer(message.guild, queueConstructor.songs[0], message, serverQueue);
}

const stopSong = (message) => {
    if (!message.member.voice.channel) return message.reply('You need to be in a channel to use this command');
    queue.delete(message.guild.id);
    player.stop();
    connection.destroy();
    message.reply('***Leaving channel*** :smiling_face_with_tear:')
}