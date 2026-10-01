import { TAU, rand } from './utils.js';

export const PETS = [
  { id: 'hamster', emoji: '🐹', name: '仓鼠·团团' },
  { id: 'poop', emoji: '💩', name: '神秘便便·臭臭' },
  { id: 'tooth', emoji: '🦷', name: '幸运之牙·牙牙' },
  { id: 'wing', emoji: '🍗', name: '蜜汁鸡翅·翅翅' },
  { id: 'cat', emoji: '🐱', name: '旅行小猫·咪咪' },
  { id: 'dog', emoji: '🐶', name: '探险小狗·旺财' },
  { id: 'chick', emoji: '🐥', name: '蛋壳小鸡·叽叽' },
  { id: 'frog', emoji: '🐸', name: '荷叶青蛙·呱呱' },
  { id: 'octopus', emoji: '🐙', name: '章鱼向导·章章' },
  { id: 'star', emoji: '🌟', name: '星尘精灵·星星' },
];

export function petById(id) {
  return PETS.find((p) => p.id === id) || PETS[0];
}

export class Pet {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.phase = rand(TAU);
    this.newT = 0;
  }

  init(player) {
    this.x = player.x - 44;
    this.y = player.y;
    this.phase = rand(TAU);
    this.newT = 0;
  }

  sparkle() {
    this.newT = 1.8;
  }

  update(dt, player) {
    this.phase += dt * (1.6 + Math.hypot(player.vx, player.vy) / 260);
    if (this.newT > 0) this.newT -= dt;
    let tx;
    let ty;
    if (player.moving || Math.hypot(player.vx, player.vy) > 30) {
      const a = Math.atan2(player.vy, player.vx) + Math.PI;
      tx = player.x + Math.cos(a) * 48;
      ty = player.y + Math.sin(a) * 48 - 8;
    } else {
      tx = player.x + Math.cos(this.phase * 0.8) * 34;
      ty = player.y + Math.sin(this.phase * 0.8) * 24 - 8;
    }
    const k = 1 - Math.exp(-dt * 6);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  }

  draw(ctx, time, player) {
    const def = petById(player.pets[player.petIndex]);
    const bob = Math.abs(Math.sin(this.phase * 2)) * 7;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(30,50,40,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 12, 4.5, 0, 0, TAU);
    ctx.fill();
    if (this.newT > 0) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 8);
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath();
      ctx.arc(0, -bob, 22, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = '26px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.emoji, 0, -bob);
    ctx.restore();
  }
}
