/**
 * Fake answers so the interface can be clicked through before n8n exists.
 * Switch MOCK_MODE to false in src/config.ts to talk to the real webhook.
 * Nothing here runs in production once mock mode is off.
 */
import type { AgentResponse } from './types';
import { delay } from './utils';

/** Thrown for a fake 401 so the app treats it exactly like a real one. */
export class MockUnauthorized extends Error {}

let poCounter = 7;

export async function mockRequest(
  action: 'ping' | 'message' | 'approve',
  password: string,
  message: string,
): Promise<AgentResponse> {
  // 1-2 s, so loading states behave like they will against the real agent.
  await delay(1000 + Math.random() * 1000);

  if (action === 'ping') {
    if (password === 'wrong') throw new MockUnauthorized();
    return { type: 'pong' };
  }

  if (action === 'approve') {
    poCounter += 1;
    return {
      type: 'sent',
      text: 'Имейлът е изпратен и поръчката е записана.',
      poNumber: `PO-2026-${String(poCounter).padStart(4, '0')}`,
    };
  }

  const text = message.toLowerCase();

  if (text.includes('ignore') || text.includes('игнорирай')) {
    return {
      type: 'blocked',
      text: 'Заявката беше спряна, защото изглежда като опит за заобикаляне на правилата.',
    };
  }

  // "Филип" on its own is ambiguous — two suppliers have a contact with that name.
  const mentionsFilip = message.includes('Филип');
  const hasSurname = message.includes('Петров') || message.includes('Георгиев');
  if (mentionsFilip && !hasSurname) {
    return {
      type: 'reply',
      text:
        'Има двама доставчици с контакт на име Филип:\n' +
        '• Филип Петров — ТехноКомпонент ООД (дискове, памет)\n' +
        '• Филип Георгиев — МемориЛайн ЕООД (памет, SSD)\n\n' +
        'Към кой да изпратя заявката?',
    };
  }

  return {
    type: 'draft',
    text: 'Ето черновата. Прегледай я и я изпрати, ако е наред.',
    draft: {
      to: 'filip.petrov@technocomponent.bg',
      subject: 'Заявка за 20 бр. SSD 1TB — samkobuilds.hardware',
      company: 'ТехноКомпонент ООД',
      contactPerson: 'Филип Петров',
      body:
        'Здравейте, Филип,\n\n' +
        'Бихме искали да заявим 20 броя SSD дискове 1TB с доставка до петък.\n\n' +
        'Моля, потвърдете писмено наличността, единичната цена и точната дата на доставка.\n\n' +
        'Поздрави,\n' +
        'samkobuilds.hardware',
    },
  };
}
