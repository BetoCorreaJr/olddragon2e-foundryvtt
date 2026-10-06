/**
 * Resolves which equipped ammunition item (if any) a weapon should consume for an attack.
 *
 * Ammo tracking is opt-in per weapon via `system.ammo_type` ('none' by default, matching every
 * real compendium item today — untracked weapons must keep attacking normally).
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {{requiresAmmo: boolean, ammoItem: Item|null, ambiguous: boolean}}
 */
export const resolveAmmo = (actor, weapon) => {
  const ammoType = weapon.system.ammo_type ?? 'none';

  if (ammoType === 'none') {
    return { requiresAmmo: false, ammoItem: null, ambiguous: false };
  }

  if (ammoType === 'self') {
    return { requiresAmmo: true, ammoItem: weapon, ambiguous: false };
  }

  const equippedAmmo = actor.system.equipped_ammunition ?? [];
  const matches = equippedAmmo.filter((ammo) => ammo.system[ammoType] === true);

  if (matches.length > 1) {
    return { requiresAmmo: true, ammoItem: null, ambiguous: true };
  }

  return { requiresAmmo: true, ammoItem: matches[0] ?? null, ambiguous: false };
};

/**
 * Applies the ammo tracking setting to an attack: warns and returns `allowed: false` when the
 * attack must be blocked, otherwise returns the ammunition item to consume afterwards (or null).
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {{allowed: boolean, ammoItem: Item|null}}
 */
export const checkAmmo = (actor, weapon) => {
  if (!game.settings.get('olddragon2e', 'ammoTracking')) return { allowed: true, ammoItem: null };

  const { requiresAmmo, ammoItem, ambiguous } = resolveAmmo(actor, weapon);
  if (ambiguous) {
    ui.notifications.warn(game.i18n.localize('olddragon2e.warnings.ambiguousAmmo'));
    return { allowed: false, ammoItem: null };
  }
  if (requiresAmmo && (!ammoItem || ammoItem.system.quantity <= 0)) {
    ui.notifications.warn(game.i18n.format('olddragon2e.ammoTracking.outOfAmmo', { weapon: weapon.name }));
    return { allowed: false, ammoItem: null };
  }
  return { allowed: true, ammoItem };
};

/**
 * Spends one unit of the ammunition `checkAmmo` returned, announcing when it runs out.
 *
 * @param {Actor} actor
 * @param {Item|null} ammoItem
 * @param {Item} weapon
 */
export const consumeAmmo = async (actor, ammoItem, weapon) => {
  // The item may have been deleted while the roll dialog was open.
  const live = ammoItem && actor.items.get(ammoItem.id);
  if (!live) return;

  const remaining = Math.max(live.system.quantity - 1, 0);
  await live.update({ 'system.quantity': remaining });
  if (remaining === 0) {
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="title">${game.i18n.format('olddragon2e.ammoTracking.ranOut', { weapon: weapon.name })}</div>`,
    });
  }
};
