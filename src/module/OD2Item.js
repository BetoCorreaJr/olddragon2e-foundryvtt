export default class OD2Item extends Item {
  async roll() {
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/olddragon2e/templates/chat/item-chat.hbs',
      {
        name: this.name,
        img: this.img,
        description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.system.description ?? '', {
          rollData: this.actor?.getRollData(),
        }),
      },
    );

    return ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
    });
  }
}
