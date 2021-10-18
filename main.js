const Discord = require('discord.js');

const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"] })

const prefix = '-';

const fs = require('fs');

client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for (const file of commandFiles)
{
    const command = require(`./commands/${file}`);

    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log('Bot ready');
});

client.on('message', message => {
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    try
    {
        if (command === 'play')
        {
            client.commands.get('play').execute(message, args)
        }
        else if (command == 'clear')
        {
            client.commands.get('clear').execute(message, args)
        }
        else if (command == 'skip')
        {
            client.commands.get('play').execute(message, args)
        }
        else if (command == 'stop')
        {
            client.commands.get('play').execute(message, args)
        }
        else
        {
            message.channel.send('That isnt a valid command');
        }
    }
    catch (err)
    {
        message.reply('Bot crashed');
        console.log(err);
    }
});

client.login('TOKEN REMOVED FOR GITHUB');