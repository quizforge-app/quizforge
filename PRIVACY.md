# Privacy Policy — Quizard

_Last updated: September 2026_

Quizard is designed so that **your study data never has to leave your device**. This policy explains exactly what stays local and what — only with your explicit action — goes to the cloud.

## What is stored on your device only

Everything you create in Quizard lives in your browser's or phone's local storage (IndexedDB):

- Imported documents (PDF, DOCX, PPTX, TXT, MD) and their extracted text and images
- Generated quizzes, your answers, attempts and scores
- Flashcards, mistakes, saved review notes and spaced-repetition schedules
- Encrypted backups you create (before you choose to move them anywhere)
- Your profile names, PINs (stored as salted hashes), theme and preferences

We do not run analytics, advertising, or tracking of any kind.

## What is sent to the cloud — only when you choose

Three features are optional and require an internet connection. When you use them, limited data is sent to a server relay operated by the app author:

1. **AI question writing** — when enabled, excerpts of your imported document text are sent to generate exam-style questions. The relay forwards requests to Google Gemini, GLM (Z.ai) or Cloudflare Workers AI.
2. **Answer explanations** — the question and your chosen answer are sent to explain why an answer is correct.
3. **Wizard voice (read-aloud)** — the paragraphs being read are sent to Fish Audio to generate the wizard's voice. Audio is generated and returned; text is not stored by the relay.

In all three cases the relay rotates provider API keys, does not store your content, and requests are not logged with your identity. Quizzes, flashcards and reviewers generated **without** enabling these features are produced entirely on-device.

If you never enable the AI toggle or use read-aloud while online, **no data ever leaves your device.**

## Backups

Backups are files you create and store yourself:

- **Plain JSON backups** are readable — keep them somewhere private.
- **Encrypted backups** are protected with your passphrase using PBKDF2 (210,000 rounds) and AES-GCM-256. They can be stored in your own Google Drive or any cloud storage — nobody can read them without your passphrase, and there is no recovery if you lose it.

## Notifications

If you enable study reminders, the app schedules a **local** notification on your device (daily at 19:00 by default) showing how many review cards are due. Notification scheduling does not use a server.

## Children's privacy

Quizard supports multiple profiles (e.g. for family members). It collects no personal information from anyone: there are no accounts on a server, no emails, no analytics.

## Your control

You can export all of your data at any time (Settings → Backup), and erase everything permanently (Settings → Danger zone). Uninstalling the app removes all local data.

## Contact

Questions about this policy: open an issue at the project repository.
