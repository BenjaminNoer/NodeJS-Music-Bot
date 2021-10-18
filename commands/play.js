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
        //Get the voice channel the message sender is in
        const voiceChannel = message.member.voice.channel;

        global.player = await createAudioPlayer({ behaviors: { maxMissedFrames: 25 } });
        global.connection;
        global.queueConstructor;


        //Check if the user is in a channel and has the correct permissions to use the bot
        if (!voiceChannel) return message.reply(':loud_sound: You need to be in a voice channel to execute this command');
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('CONNECT')) return message.reply(':lock: You dont have the correct permissions');
        if (!permissions.has('SPEAK')) return message.reply(':lock: You dont have the correct permissions');

        //Get the song queue for the server the message was sent on
        const serverQueue = queue.get(message.guild.id);
        
        if (message.content.split(' ')[0].substring(1) === 'play')
        {
            if (!args.length) return message.reply(':no_entry: You need to send the second argument');
            let song = {};

            if (ytdl.validateURL(args[0]))
            {
                //Get song information directly if the command as a URL
                const songInfo = await ytdl.getInfo(args[0]);
                song = { title: songInfo.videoDetails.title, url: songInfo.videoDetails.video_url}
            }
            else
            {
                //Find song on Youtube with string and store information in videoResult
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

            //Create queue for the server the message was sent on if there is not already a queue
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

                //Establish a connection to the voice channel
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
                //Add song to the queue if one is already being played
                serverQueue.songs.push(song);
                return message.reply(`:thumbsup: **${song.title}** added to queue!`);
            }
        }
        else if (message.content.split(' ')[0].substring(1) === 'skip')
        {
            //Skip to the next song in the queue
            skipSong(message, serverQueue);
        }
        else if (message.content.split(' ')[0].substring(1) === 'stop')
        {
            //Stop the song and delete the queue
            stopSong(message);
        }
    }
}

const videoPlayer = async (guild, song, message, serverQueue) => {
    const songQueue = queue.get(guild.id);

    if (!song)
    {
        //If there is no song to play leave the voice channel and delete the queue
        await songQueue.connection.destroy();
        queue.delete(guild.id);
        return;
    }

    //Get the song audio from youtube
    const stream = ytdl(song.url, {filter: 'audioonly'});

    //Add the audio to the audio player and start the player
    const resource = await createAudioResource(stream);
    player.play(resource);

    //Add the audio player to the bot's connection
    const subscription = songQueue.connection.subscribe(player);

    player.on('error', error => {
        //console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
        try
        {
            //Remove audio resources and attempt to restart the player
            subscription.unsubscribe();
            resource = createAudioResource(stream)
            player.play();
            subscription = songQueue.connection.subscribe(player);
        }
        catch (err)
        {
            //Skip to the next song in the queue
            skipSong(message, serverQueue);
            console.log(err);
            message.channel.send('Jaskier encountered an error and could only resolve it by skipping the to next song');
        }
    });

    //Start playing the next song in the queue when the audio player becomes idle
    player.on(AudioPlayerStatus.Idle, () => {
        songQueue.songs.shift();
        videoPlayer(guild, songQueue.songs[0], message, serverQueue);
    });

    //await songQueue.text_channel.send(`:notes: Now playing **${song.title}**`)
    await message.reply(`:notes: Now playing **${song.title}**`)
}

const skipSong = (message, serverQueue) => {
    //Make sure the message sender is in a voice channel
    if (!message.member.voice.channel) return message.reply('You need to be in a channel to use this command');

    if (!serverQueue)
    {
        return message.reply('There are no songs in the queue to skip')
    }

    //Skip to the next song
    serverQueue.songs.shift();
    videoPlayer(message.guild, queueConstructor.songs[0], message, serverQueue);
}

const stopSong = (message) => {
    //Make sure the message sender is in a voice channel
    if (!message.member.voice.channel) return message.reply('You need to be in a channel to use this command');

    //Delete the queue, stop the audio player, and leave the voice channel
    queue.delete(message.guild.id);
    player.stop();
    connection.destroy();
    
    message.reply('***Leaving channel*** :smiling_face_with_tear:')
}
