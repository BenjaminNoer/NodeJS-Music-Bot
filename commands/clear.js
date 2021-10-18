module.exports = {
    name: 'clear',
    description: 'Clears messages from the chat',
    async execute(message, args){
        if (!args[0]) return message.reply('Please enter the amount of messages that you want to clear');
        if (isNaN(args[0])) return message.reply('Please enter a real number');
        if (args[0] > 100) return message.reply('You cannot clear more than 100 numbers');
        if (args[0] < 1) return message.reply('You must clear at least one message with this command');

        await message.channel.messages.fetch({limit: args[0]}).then(messages => {
            message.channel.bulkDelete(messages);
        });
    }
}