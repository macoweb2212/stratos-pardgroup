import type { SpeakRequest, StartAvatarRequest, StartAvatarResponse } from "@heygen/streaming-avatar";

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents, TaskMode, TaskType, VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

import {AVATARS, STT_LANGUAGE_LIST} from "@/app/lib/constants";
import { convertFloat32ToS16PCM, sleep } from "@/app/lib/utils";

export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("8cdab47e8147415898f7a60b9be5f798");
  const [language, setLanguage] = useState<string>('it');

  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }

    return "";
  }

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
    });
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail);
      setStream(event.detail);
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event);
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log(">>>>> User stopped talking:", event);
      setIsUserTalking(false);
    });
    try {
        let session: StartAvatarResponse 
       
        // ========================== Overrides =============================
        avatar.current.newSession = async function newSession(requestData: StartAvatarRequest): Promise<StartAvatarResponse> {
            console.log("New session")
            //@ts-ignore
            const response = await fetch("/api/streaming.new", {
                method: "POST",
                body: JSON.stringify(requestData),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`
                }
            });

            session = (await response.json()).data
            console.log(session)

            return session;
        }

        avatar.current!.startSession = async function newSession(): Promise<any> {
            //@ts-ignore
            console.log("Start session", (session.session_id))
            //@ts-ignore
            return await fetch("/api/streaming.start", {
                method: "POST",
                body: JSON.stringify({
                    //@ts-ignore
                    sessionId: session.session_id
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`
                }
            });
        }

        avatar.current!.stopAvatar = async function newSession(): Promise<any> {
            this.closeVoiceChat()
            //@ts-ignore
            console.log("STOP", session.session_id)
            //@ts-ignore
            return await fetch("/api/streaming.stop", {
                method: "POST",
                body: JSON.stringify({
                    //@ts-ignore
                    sessionId: session.session_id
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`
                }
            });
        }

        avatar.current!.speak = async function speak(requestData: SpeakRequest): Promise<any> {
            requestData.taskType = requestData.taskType || requestData.task_type || TaskType.TALK;
            requestData.taskMode = requestData.taskMode || TaskMode.ASYNC;
        
            // try to use websocket first
            // only support talk task
            if (
                // @ts-ignore
              this.webSocket && this.audioRawFrame &&
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
            return fetch('/api/streaming.task', {
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
                    Authorization: `Bearer ${this.token}`
                }
            });
        }

        avatar.current!.startListening = async function startListening(): Promise<any> {
            return await fetch("/api/streaming.start_listening", {
                method: "POST",
                body: JSON.stringify({
                    //@ts-ignore
                    session_id: session.session_id
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`
                }
            });
        }

        avatar.current!.stopListening = async function stopListening(): Promise<any> {
            return await fetch("/api/streaming.stop_listening", {
                method: "POST",
                body: JSON.stringify({
                    //@ts-ignore
                    session_id: session.session_id
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`
                }
            });
        }

        avatar.current!.interrupt = async function interrupt(): Promise<any> {
            return await fetch("/api/streaming.interrupt", {
                method: "POST",
                body: JSON.stringify({
                    //@ts-ignore
                    session_id: session.session_id
                }),
                headers: {
                    //@ts-ignore
                    Authorization: `Bearer ${this.token}`
                }
            });
        }

        // ========================== End Overrides =============================
      
        const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: avatarId,
        knowledgeId: knowledgeId, // Or use a custom `knowledgeBase`.
        voice: {
          rate: 1.5, // 0.5 ~ 1.5
          emotion: VoiceEmotion.EXCITED,
          // elevenlabsSettings: {
          //   stability: 1,
          //   similarity_boost: 1,
          //   style: 1,
          //   use_speaker_boost: false,
          // },
        },
        language: language,
        disableIdleTimeout: true,
      });

      setData(res);
      console.log(avatar.current)
      // default to voice mode
      await avatar.current?.startVoiceChat({
        useSilencePrompt: false
      });
      setChatMode("voice_mode");
    } catch (error) {
      console.error("Error starting avatar session:", error);
      endSession()
    } finally {
      setIsLoadingSession(false);
    }
  }
  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    // speak({ text: text, task_type: TaskType.REPEAT })
    await avatar.current.speak({ text: text, taskType: TaskType.TALK, taskMode: TaskMode.SYNC }).catch((e) => {
      setDebug(e.message);
    });
    setIsLoadingRepeat(false);
  }
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    await avatar.current
      .interrupt()
      .catch((e) => {
        setDebug(e.message);
      });
  }
  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
  }

  const handleChangeChatMode = useMemoizedFn(async (v) => {
    if (v === chatMode) {
      return;
    }
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
    } else {
      await avatar.current?.startVoiceChat({
        useSilencePrompt: false
      });
    }
    setChatMode(v);
  });

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
    <div className="size-full flex flex-col items-center justify-center gap-4">
      <Card className="w-[900px]">
        <CardBody className="h-[500px] flex flex-col justify-center items-center">
          {stream ? (
            <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
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
                  Interrupt task
                </Button>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300  text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={endSession}
                >
                  End session
                </Button>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center">
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
                <div className="text-center font-semibold text-lg"> 
                    Scopri il consulente virtuale Plenitude: informazioni complete sui nostri prodotti e servizi, con la possibilità effettuare roleplay di vendita e altre simulazioni interattive.
                </div>
              </div>
              <div className="flex w-full gap-5">
                <Button
                    className="flex-1 bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white h-14"
                    size="md"
                    variant="shadow"
                    onClick={startSession}
                >
                    Start session
                </Button>
                <Select
                  label="Select language"
                  placeholder="Select language"
                  className="h-10 w-32"
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
                </Select>

              </div>
            </div>
          ) : (
            <Spinner color="default" size="lg" />
          )}
        </CardBody>
        <Divider />
        <CardFooter className="flex flex-col gap-3 relative">
          <Tabs
            aria-label="Options"
            selectedKey={chatMode}
            onSelectionChange={(v) => {
              handleChangeChatMode(v);
            }}
          >
            <Tab key="text_mode" title="Text mode" />
            <Tab key="voice_mode" title="Voice mode" />
          </Tabs>
          {chatMode === "text_mode" ? (
            <div className="w-full flex relative">
              <InteractiveAvatarTextInput
                disabled={!stream}
                input={text}
                label="Chat"
                loading={isLoadingRepeat}
                placeholder="Type something for the avatar to respond"
                setInput={setText}
                onSubmit={handleSpeak}
              />
              {text && (
                <Chip className="absolute right-16 top-3">Listening</Chip>
              )}
            </div>
          ) : (
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
          )}
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
