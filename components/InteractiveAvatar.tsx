import type {
    SpeakRequest,
    StartAvatarRequest,
    StartAvatarResponse,
} from "@heygen/streaming-avatar";

import StreamingAvatar, {
    AvatarQuality,
    StreamingEvents,
    TaskMode,
    TaskType,
    VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    Chip,
    Divider,
    Select,
    SelectItem,
    Spinner,
    Tab,
    Tabs,
} from "@nextui-org/react";
import { useMemoizedFn, usePrevious } from "ahooks";
import { useEffect, useRef, useState } from "react";

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

import { fetchAccessToken } from "@/app/lib/apiClient/apiClient";
import { streamResponse } from "@/app/lib/apiClient/chat";
import { STT_LANGUAGE_LIST } from "@/app/lib/constants";
import { CoreMessage } from "ai";
import { PromiseQueue } from "@/app/lib/promiseQueue/promiseQueue";

export default function InteractiveAvatar() {
    const [isLoadingSession, setIsLoadingSession] = useState(false);
    const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
    const [stream, setStream] = useState<MediaStream>();
    const [debug, setDebug] = useState<string>();
    const [avatarId, setAvatarId] = useState<string>("8cdab47e8147415898f7a60b9be5f798");
    const [language, setLanguage] = useState<string>("it");

    const [data, setData] = useState<StartAvatarResponse>();
    const [text, setText] = useState<string>("");
    const mediaStream = useRef<HTMLVideoElement>(null);
    const avatar = useRef<StreamingAvatar | null>(null);
    //const [chatMode, setChatMode] = useState("text_mode");
    const [isUserTalking, setIsUserTalking] = useState(false);
    const chatHistory = useRef<CoreMessage[]>([]);

    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = "it-IT";
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onend = async (event) => {
            setIsUserTalking(false);
        }

        recognitionRef.current.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("User said:", transcript);

            chatHistory.current = [
                ...chatHistory.current,
                {
                    role: "user",
                    content: transcript,
                },
            ];
            console.log("chatHistory before", chatHistory.current);
            const reader = await streamResponse(chatHistory.current);
            const decoder = new TextDecoder();

            let fullText = "";
            let partialText = "";
            const promiseQueue = new PromiseQueue();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                partialText += chunk;

                partialText = fixText(partialText);
                fullText = fixText(fullText);

                const regexPunctuation = /\./;
                const firstPunctuationIndex = partialText.search(regexPunctuation);
                if (firstPunctuationIndex != -1) {
                    console.log("Found a punctuation");
                    console.log("Partial text: ", partialText);
                    const firstPart = partialText.slice(0, firstPunctuationIndex + 1);
                    const secondPart = partialText.slice(firstPunctuationIndex + 1).trim();

                    console.log("First part:", firstPart);
                    console.log("Second part:", secondPart);

                    promiseQueue.add(async () => {
                        await new Promise((resolve) => setTimeout(resolve, 100));
                        console.log("Sending first part: ", firstPart);
                        await avatar.current
                            ?.speak({
                                text: firstPart,
                                taskType: TaskType.REPEAT,
                                taskMode: TaskMode.ASYNC,
                            })
                            .catch((error) => {
                                console.error("Error while sending async repeat task:", error);
                            });
                    });

                    partialText = secondPart;
                }
            }

            // If there's any partial text left then speak
            if (partialText.length >= 0) {
                promiseQueue.add(async () => {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    console.log("Sending final part: ", partialText);
                    avatar.current
                        ?.speak({
                            text: partialText,
                            taskType: TaskType.REPEAT,
                            taskMode: TaskMode.ASYNC,
                        })
                        .then((result) => {
                            console.log(result);
                        })
                        .catch((error) => {
                            console.error("Error while sending async repeat task:", error);
                        });
                });
            }
            // avatar.current
            //     ?.speak({
            //         text: fullText,
            //         taskType: TaskType.REPEAT,
            //     })
            //     .catch((error) => {
            //         console.log("Error while sending async repeat task", error);
            //     });

            console.log("fulltext", fullText);
            chatHistory.current = [
                ...chatHistory.current,
                { role: "assistant", content: fullText },
            ];
            console.log("chatHistory after response", chatHistory.current);
            // console.log("Gemini's response", response.text);
            // console.log("Recognition response", response);
            // avatar.current?.speak({
            //     task_type: TaskType.REPEAT,
            //     text: response.text ?? "no text, just respond with error",
            // });
        };

        recognitionRef.current.onerror = (error) => {
            console.log("There was an error on speech recognition", error);
        };

        recognitionRef.current.addEventListener("soundstart", (event) => {
            console.log("sound start");
        });

        recognitionRef.current.onstart = (error) => {
            setIsUserTalking(true);
        };

    }, []);

    async function startSession() {
        setIsLoadingSession(true);
        const newToken = await fetchAccessToken();

        avatar.current = new StreamingAvatar({
            token: newToken,
        });

        try {
            registerOverrides();
            registerAvatarEvents();

            const res = await avatar.current.createStartAvatar({
                quality: AvatarQuality.High,
                avatarName: avatarId,
                knowledgeId: "8c0e0d1c9e3b43ebbcfaf2311852d8c4",
                voice: {
                    rate: 1,
                    emotion: VoiceEmotion.EXCITED,
                },
                language: language,
            });

            setData(res);
            console.log(avatar.current);
            // default to voice mode
            //   await avatar.current?.startVoiceChat({
            //     useSilencePrompt: false
            //   });
            //   setChatMode("voice_mode");
        } catch (error) {
            console.error("Error starting avatar session:", error);
            endSession();
        } finally {
            setIsLoadingSession(false);
        }
    }

    async function registerOverrides() {
        let session: StartAvatarResponse;

        avatar.current!.newSession = async function newSession(
            requestData: StartAvatarRequest,
        ): Promise<StartAvatarResponse> {
            console.log("New session");
            //@ts-ignore
            const response = await fetch("/api/streaming.new", {
                method: "POST",
                body: JSON.stringify(requestData),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`,
                },
            });

            session = (await response.json()).data;
            console.log(session);

            return session;
        };

        avatar.current!.startSession = async function newSession(): Promise<any> {
            //@ts-ignore
            console.log("Start session", session.session_id);
            //@ts-ignore
            return await fetch("/api/streaming.start", {
                method: "POST",
                body: JSON.stringify({
                    //@ts-ignore
                    sessionId: session.session_id,
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`,
                },
            });
        };

        avatar.current!.stopAvatar = async function newSession(): Promise<any> {
            this.closeVoiceChat();
            //@ts-ignore
            console.log("STOP", session.session_id);
            //@ts-ignore
            return await fetch("/api/streaming.stop", {
                method: "POST",
                body: JSON.stringify({
                    //@ts-ignore
                    sessionId: session.session_id,
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`,
                },
            });
        };

        avatar.current!.speak = async function speak(requestData: SpeakRequest): Promise<any> {
            requestData.taskType = requestData.taskType || requestData.task_type || TaskType.TALK;
            requestData.taskMode = requestData.taskMode || TaskMode.ASYNC;

            // try to use websocket first
            // only support talk task
            if (
                // @ts-ignore
                this.webSocket &&
                // @ts-ignore
                this.audioRawFrame &&
                requestData.task_type === TaskType.TALK &&
                requestData.taskMode !== TaskMode.SYNC
            ) {
                // @ts-ignore
                const frame = this.audioRawFrame?.create({
                    text: {
                        text: requestData.text,
                    },
                });
                // @ts-ignore
                const encodedFrame = new Uint8Array(this.audioRawFrame?.encode(frame).finish());
                // @ts-ignore
                this.webSocket?.send(encodedFrame);
                return;
            }
            // @ts-ignore
            return fetch("/api/streaming.task", {
                method: "POST",
                body: JSON.stringify({
                    text: requestData.text,
                    // @ts-ignore
                    session_id: this.sessionId,
                    task_mode: requestData.taskMode,
                    task_type: requestData.taskType,
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`,
                },
            });
        };

        avatar.current!.startListening = async function startListening(): Promise<any> {
            return await fetch("/api/streaming.start_listening", {
                method: "POST",
                body: JSON.stringify({
                    //@ts-ignore
                    session_id: session.session_id,
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`,
                },
            });
        };

        avatar.current!.stopListening = async function stopListening(): Promise<any> {
            return await fetch("/api/streaming.stop_listening", {
                method: "POST",
                body: JSON.stringify({
                    //@ts-ignore
                    session_id: session.session_id,
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`,
                },
            });
        };

        avatar.current!.interrupt = async function interrupt(): Promise<any> {
            return await fetch("/api/streaming.interrupt", {
                method: "POST",
                body: JSON.stringify({
                    //@ts-ignore
                    session_id: session.session_id,
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`,
                },
            });
        };
    }

    async function registerAvatarEvents() {
        avatar.current?.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
            console.log("Avatar started talking", e);
        });
        avatar.current?.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
            console.log("Avatar stopped talking", e);
        });
        avatar.current?.on(StreamingEvents.STREAM_DISCONNECTED, () => {
            console.log("Stream disconnected");
            endSession();
        });
        avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
            console.log(">>>>> Stream ready:", event.detail);
            setStream(event.detail);
            console.log("Recognition speech started");
            recognitionRef.current?.start();
        });
        avatar.current?.on(StreamingEvents.USER_START, (event) => {
            console.log(">>>>> User started talking:", event);
            setIsUserTalking(true);
        });
        avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
            console.log(">>>>> User stopped talking:", event);
            setIsUserTalking(false);
        });
    }

    async function handleSpeak() {
        setIsLoadingRepeat(true);
        if (!avatar.current) {
            setDebug("Avatar API not initialized");

            return;
        }
        // speak({ text: text, task_type: TaskType.REPEAT })
        await avatar.current
            .speak({ text: text, taskType: TaskType.TALK, taskMode: TaskMode.SYNC })
            .catch((e) => {
                setDebug(e.message);
            });
        setIsLoadingRepeat(false);
    }
    async function handleInterrupt() {
        if (!avatar.current) {
            setDebug("Avatar API not initialized");

            return;
        }
        await avatar.current.interrupt().catch((e) => {
            setDebug(e.message);
        });
    }
    async function endSession() {
        await avatar.current?.stopAvatar();
        setStream(undefined);
    }

    function fixText(text: string): string {
        return text.replaceAll(/(\d)(?=€)/g, '$1 ').replaceAll("€", "euro").replaceAll("kilowatt (kW)", "kilowatt").replaceAll("kW", "kilowatt").replaceAll(/(\d)(?=kilowatt)/g, '$1 ').replaceAll(/\d+/g, (match) => {
            return numberInLetters(parseInt(match));
        }).replaceAll("mille", "mille ");
    }

    function numberInLetters(n: number): string {
        const unita = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];
        const decine = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];
        const speciali = ['dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];

        if (n < 10) return unita[n];
        if (n < 20) return speciali[n - 10];

        if (n < 100) {
            let d = Math.floor(n / 10), u = n % 10;
            let parola = decine[d];
            if (u === 1 || u === 8) parola = parola.slice(0, -1); // Elisione
            return parola + (u > 0 ? unita[u] : '');
        }

        if (n < 1000) {
            let c = Math.floor(n / 100), resto = n % 100;
            let parola = (c === 1 ? 'cento' : unita[c] + 'cento');
            if (resto >= 80 && resto < 90) parola = parola.slice(0, -1); // Elisione con "ottanta"
            return parola + (resto > 0 ? numberInLetters(resto) : '');
        }

        if (n < 10000) {
            let m = Math.floor(n / 1000), resto = n % 1000;
            let mille: any = (m === 1 ? 'mille' : numberInLetters(m) + 'mila');
            return mille + (resto > 0 ? numberInLetters(resto) : '');
        }

        return n.toString(); // fuori range
    }

    /*const handleChangeChatMode = useMemoizedFn(async (v) => {
        if (v === chatMode) {
            return;
        }
        if (v === "text_mode") {
            avatar.current?.closeVoiceChat();
        } else {
            await avatar.current?.startVoiceChat({
                // useSilencePrompt: false,
            });
        }
        setChatMode(v);
    });*/

    const previousText = usePrevious(text);
    useEffect(() => {
        if (!previousText && text) {
            avatar.current?.startListening();
        } else if (previousText && !text) {
            avatar?.current?.stopListening();
        }
    }, [text, previousText]);

    useEffect(() => {
        return () => {
            endSession();
        };
    }, []);

    useEffect(() => {
        if (stream && mediaStream.current) {
            mediaStream.current.srcObject = stream;
            mediaStream.current.onloadedmetadata = () => {
                mediaStream.current!.play();
                setDebug("Playing");
            };
        }
    }, [mediaStream, stream]);

    return (
        <div className="size-full flex flex-col items-center justify-center gap-4 p-5">
            <Card className="w-full md:max-w-[900px]">
                <CardBody className="h-[500px] flex flex-col justify-center items-center">
                    {stream ? (
                        <div className="size-full justify-center items-center flex rounded-lg overflow-hidden">
                            <video
                                ref={mediaStream}
                                autoPlay
                                playsInline
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                            >
                                <track kind="captions" />
                            </video>
                            <div className="flex flex-col gap-2 absolute bottom-3 right-3">
                                <Button
                                    className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                                    size="md"
                                    variant="shadow"
                                    onClick={handleInterrupt}
                                >
                                    Pausa
                                </Button>
                                <Button
                                    className="bg-gradient-to-tr from-indigo-500 to-indigo-300  text-white rounded-lg"
                                    size="md"
                                    variant="shadow"
                                    onClick={endSession}
                                >
                                    Termina sessione
                                </Button>
                                <Button
                                    className={`text-white rounded-lg ${isUserTalking
                                        ? "bg-green-500 hover:bg-green-600"
                                        : "bg-gradient-to-tr from-indigo-500 to-indigo-300"
                                        }`}
                                    size="md"
                                    variant="shadow"
                                    onClick={() => {
                                        isUserTalking ? recognitionRef.current?.stop() : recognitionRef.current?.start();
                                    }}
                                >
                                    {isUserTalking ? 'In ascolto' : 'Parla'}
                                </Button>
                            </div>
                        </div>
                    ) : !isLoadingSession ? (
                        <div className="h-full justify-center items-center flex flex-col gap-8 w-full self-center">
                            <div className="flex flex-col gap-2 w-full">
                                {/* <p className="text-sm font-medium leading-none">
                  Custom Knowledge ID (optional)
                </p>
                <Input
                  placeholder="Enter a custom knowledge ID"
                  value={knowledgeId}
                  onChange={(e) => setKnowledgeId(e.target.value)}
                /> */}
                                {/* <p className="text-sm font-medium leading-none">
                  Custom Avatar ID (optional)
                </p>
                <Input
                  placeholder="Enter a custom avatar ID"
                  value={avatarId}
                  onChange={(e) => setAvatarId(e.target.value)}
                /> */}
                                {/* <Select
                  placeholder="Or select one from these example avatars"
                  size="md"
                  onChange={(e) => {
                    setAvatarId(e.target.value);
                  }}
                >
                  {AVATARS.map((avatar) => (
                    <SelectItem
                      key={avatar.avatar_id}
                      textValue={avatar.avatar_id}
                    >
                      {avatar.name}
                    </SelectItem>
                  ))}
                </Select> */}
                                {/* <Select
                  label="Select language"
                  placeholder="Select language"
                  className="max-w-xs"
                  selectedKeys={[language]}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                >
                  {STT_LANGUAGE_LIST.map((lang) => (
                    <SelectItem key={lang.key}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </Select> */}
                                <div className="text-center font-semibold text-base md:text-lg">
                                    Scopri il consulente virtuale Plenitude: informazioni complete
                                    sui nostri prodotti e servizi, con la possibilità effettuare
                                    roleplay di vendita e altre simulazioni interattive.
                                </div>
                            </div>
                            <div className="flex w-full gap-5">
                                <Button
                                    className="flex-1 bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white h-14"
                                    size="md"
                                    variant="shadow"
                                    onPress={startSession}
                                >
                                    Inizia sessione
                                </Button>
                                <Select
                                    label="Seleziona lingua"
                                    placeholder="Seleziona lingua"
                                    className="h-10 w-32"
                                    selectedKeys={[language]}
                                    onChange={(e) => {
                                        setLanguage(e.target.value);
                                    }}
                                >
                                    {STT_LANGUAGE_LIST.map((lang) => (
                                        <SelectItem key={lang.key}>{lang.label}</SelectItem>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <Spinner color="default" size="lg" />
                    )}
                </CardBody>
                <Divider />
                <CardFooter className="flex flex-col gap-3 relative">
                    {/*<Tabs
                        aria-label="Options"
                        selectedKey={chatMode}
                        onSelectionChange={(v) => {
                            handleChangeChatMode(v);
                        }}
                    >
                        <Tab key="text_mode" title="Modalità testo" />
                        <Tab key="voice_mode" title="Modalità voce" />
                    </Tabs>
                    {//chatMode === "text_mode" ? (*/}
                    <div className="w-full flex relative">
                        <InteractiveAvatarTextInput
                            disabled={!stream}
                            input={text}
                            label="Chat"
                            loading={isLoadingRepeat}
                            placeholder="Scrivi qualcosa all'avatar"
                            setInput={setText}
                            onSubmit={handleSpeak}
                        />
                        {text && <Chip className="absolute right-16 top-3">Listening</Chip>}
                    </div>
                    {/*) : (
                        <div className="w-full text-center">
                            <Button
                                isDisabled={!isUserTalking}
                                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                                size="md"
                                variant="shadow"
                            >
                                {isUserTalking ? "Listening" : "Voice chat"}
                            </Button>
                        </div>
                    )*/}
                </CardFooter>
            </Card>
            {/* <p className="font-mono text-right">
        <span className="font-bold">Console:</span>
        <br />
        {debug}
      </p> */}
        </div>
    );
}
