# samkoBuilds Orders Processor

A chat page for the samkobuilds.hardware shop. An employee types an order request
in Bulgarian, optionally attaches a photo of the item, and an n8n AI agent writes
an email draft. The employee presses one button to send it.

**This page is only the screen.** It does no AI, finds no suppliers and sends no
email. It talks to a single n8n webhook, and n8n does all the real work.

---

## 1. Run it on your own computer

You need [Node.js](https://nodejs.org) 20 or newer installed.

Open a terminal in this folder and run:

```bash
npm install
```

Then start it:

```bash
npm run dev
```

The terminal prints an address. Open it in your browser — usually
<http://localhost:5173/orders-processor/>.

It starts in **demo mode**, so you can click through everything without n8n.
In demo mode:

- Any username and password let you in, **except** the password `wrong`, which
  shows the "wrong password" message.
- A message mentioning "Филип" without a surname gets a follow-up question.
- A message containing "игнорирай" or "ignore" gets blocked.
- Anything else produces a fake email draft you can approve.

A blue **MOCK** badge sits in the header the whole time demo mode is on.

To stop the server, press `Ctrl+C` in the terminal.

---

## 2. Connect it to n8n

Everything you need to change is in one file: **`src/config.ts`**.

1. In n8n, open your workflow's **Webhook** node and copy the **Production URL**.
2. Open `src/config.ts` and paste it:

   ```ts
   export const WEBHOOK_URL = 'https://your-name.app.n8n.cloud/webhook/xxxxxxxx';
   ```

3. In the same file, turn demo mode off:

   ```ts
   export const MOCK_MODE = false;
   ```

4. Save the file. If `npm run dev` is still running, the page reloads by itself.

### Two settings you must change inside n8n

Without these the page cannot talk to n8n, and the browser will report a
connection error:

- **Allowed Origins (CORS)** on the Webhook node → set it to
  `https://samkata656.github.io`
  (while testing on your own computer, also add `http://localhost:5173`).
- **Authentication → Basic Auth** on the Webhook node → turn it on and set the
  username and password the employees will type.

The username and password are **never** written anywhere in this project. The page
only passes along what the employee types, and n8n decides whether it is correct.

---

## 3. Put it online (GitHub Pages)

1. Create a GitHub repository named exactly **`orders-processor`** and push this
   folder to its `main` branch.
2. On GitHub, open **Settings → Pages**.
3. Under **Source**, choose **GitHub Actions**. (Not "Deploy from a branch".)
4. That's it. Every push to `main` builds and publishes the site automatically —
   watch it run under the **Actions** tab.

Your page will be at:

```
https://samkata656.github.io/orders-processor/
```

**If you name the repository something other than `orders-processor`,** open
`vite.config.ts` and change `base` to match, or the page will load blank:

```ts
base: '/your-repo-name/',
```

---

## 4. What the page sends to n8n

One `POST` to your webhook URL, as `multipart/form-data`, with an
`Authorization: Basic …` header. Fields:

| Field | When | What it is |
|---|---|---|
| `action` | always | `ping`, `message` or `approve` |
| `sessionId` | always | a random id, new for every conversation |
| `message` | on `message` | what the employee typed |
| `draft` | on `approve` | the approved draft as JSON: `to`, `subject`, `body`, `company`, `contactPerson` |
| `image` | sometimes | the attached photo (JPG/PNG/WEBP, up to 5 MB) |

n8n must answer with JSON containing a `type`:

```json
{ "type": "pong" }
{ "type": "reply",   "text": "Има двама доставчици с име Филип… Към кой да изпратя?" }
{ "type": "draft",   "text": "Ето черновата:", "draft": { "to": "…", "subject": "…", "body": "…", "company": "…", "contactPerson": "…" } }
{ "type": "blocked", "text": "Заявката беше спряна…" }
{ "type": "sent",    "text": "Имейлът е изпратен.", "poNumber": "PO-2026-0007" }
{ "type": "error",   "text": "…" }
```

If n8n answers `401`, the page logs the employee out and asks them to sign in
again. Anything else that goes wrong shows a message in the chat with a
**Опитай отново** button.

---

## 5. Where things live

```
src/
  config.ts              the only file you normally edit
  api.ts                 the single call to n8n
  mock.ts                the fake answers used in demo mode
  types.ts               the shapes of messages and drafts
  utils.ts               small helpers
  components/
    LoginScreen.tsx      sign-in card
    ChatScreen.tsx       the whole chat, and who talks to n8n
    Composer.tsx         the message box, attach and send
    DraftCard.tsx        the email draft and its two buttons
    Message.tsx          one chat row
    Logo.tsx             the sB mark
    Icons.tsx            the outline icons
  styles/
    tokens.css           brand colours, fonts, spacing
    base.css             buttons, inputs, badges
    app.css              the screens
```

### Swapping in the official logo

`src/components/Logo.tsx` draws the sB monogram with real text in Montserrat, so
it is sharp at any size and needs no image file. If you want to use the official
SVG instead, replace the `<span>` inside the `Monogram` function with your
`<svg>` and leave the rest alone.

---

## 6. Things worth knowing

- **Closing the tab logs you out.** Credentials are kept in `sessionStorage`,
  which the browser throws away when the tab closes.
- **An email only goes out when "Изпрати имейла" is pressed.** The button goes
  dead on the first click, so the same draft cannot be sent twice.
- **Only the newest draft can be sent.** Older ones grey out and say they were
  replaced.
- **The agent may take 10–40 seconds.** The page waits up to 90 seconds before
  giving up; change `REQUEST_TIMEOUT_MS` in `src/config.ts` if you need longer.
- **The short code in the footer** is the first 8 characters of the session id.
  Use it to find the matching run in the n8n executions log.
