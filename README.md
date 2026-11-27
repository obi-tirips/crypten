# Crypten

Crypten encrypts files, folders and whole workspaces with AES-256-GCM, checks every result with SHA3-512 and never
overwrites a thing. Free for everyone, forever.

**Website:** <https://obi-tirips.github.io/crypten/>

This repository holds Crypten's website, served by GitHub Pages, and its downloads, in
[Releases](https://github.com/obi-tirips/crypten/releases). Crypten's source code is not here.

## Download

Version 0.0.1 is for Windows and Linux.

| File | What it is | Needs |
|---|---|---|
| `crypten_v0.0.1_embeddedJRE27.exe` | Installer: Crypten with its own Java, into Program Files, uninstalled from Windows' settings | nothing |
| `crypten_v0.0.1_embeddedJRE27.zip` | Portable: unzip anywhere and run `Crypten.exe`; nothing is installed | nothing |
| `crypten_v0.0.1.exe` | Launcher: a small download that runs on the Java on your computer | Java 25 or newer |
| `crypten_v0.0.1.jar` | Crypten in one jar, with JavaFX for Windows: `java -jar crypten_v0.0.1.jar` | Java 25 or newer |
| `crypten_v0.0.1_linux.jar` | Linux (x64): Crypten in one jar, with JavaFX for Linux: `java -jar crypten_v0.0.1_linux.jar` | Java 25 or newer |

Before your first start: nothing can be recovered without **both** the key file and its password. Keep a copy of your
key file somewhere safe and never forget its password.

## Check your download

Every file of a release is signed with Crypten's own ML-DSA-87 key (FIPS 204). Beside each file, the release holds:

- `<file>.sig.txt`, its signature, and
- `<file>.sha3-512.txt`, its SHA3-512 hash and name on one line.

With Crypten already on your computer, open **About → Signatures → Check a download**, choose the file and paste its
signature. The first time, compare the key fingerprint About shows with this one (the public key is
[crypten-signing-public-key.txt](crypten-signing-public-key.txt)):

```
f94b4e9b 92a88a5b cbe98be9 71c2065e 953d0828 95183af2 031d74df 5cc468b9
7b0058aa 8c0a6e6c 88f2d1f8 0304ba31 dd6d8ac8 f465b310 d34d8f9f 04a35b1a
```

Then check the file's SHA3-512 with a second tool that is not Crypten, `<file>` being the file you downloaded:

| System | Command |
|---|---|
| Windows 11 24H2 or newer | `certutil -hashfile <file> SHA3-512` |
| Linux, with OpenSSL | `openssl dgst -sha3-512 <file>` |
| Any system with Python 3 | `python3 -c "import hashlib,sys; print(hashlib.sha3_512(open(sys.argv[1],'rb').read()).hexdigest())" <file>` |

Both must agree with the file's `.sha3-512.txt` and with the website.

## Before you update

Every new version of Crypten is made to open what earlier versions encrypted — but keep the version you use now until
you are sure: install the new one, check that it verifies and decrypts your existing encrypted files, folders and
workspaces, and only then remove the old one. Earlier versions are, in most cases, in this repository's
[Releases](https://github.com/obi-tirips/crypten/releases), but your own copy is the safer one. On Android, Google Play
installs updates on its own: to keep your version until you have checked a new one, open Crypten in Google Play, tap
the three-dot menu and untick *Enable auto update*.

If a newer version cannot open what an older one encrypted:

1. Open the older version of Crypten — the one you used last.
2. Decrypt the files and folders you need, and export decrypted copies of your workspaces: *Export decrypted copy* on
   each workspace (the desktop's Workspace page; Android's Workspace tab), or on any of its versions.
3. Save that decrypted data in a place only you can reach. It is not encrypted while it waits there, so keep that
   time short.
4. Open the newer version and encrypt the data again — with the same key if the newer version accepts it, otherwise
   with a new key you create in it (and keep that key file and its password safe, as always).
5. Check that the new encrypted copies verify and decrypt, then delete the decrypted data.

Both apps show these steps under **Recovery** — the desktop app in its side menu, the Android app in Settings and
About. Google Play offers only the newest Android version: if it has already updated, back up the workspace and export
its key file to a computer, and follow the steps there with the desktop app of the version that made them.

## Safety

We will never ask for your password, your keys or your data. Beware of fake e-mails: write only to the address below,
and check who a message really comes from. Lost means lost: without the key file and its password, nobody can recover
your files, so distrust every "recovery" offer.

## Contact

<obi.tirips@gmail.com>
