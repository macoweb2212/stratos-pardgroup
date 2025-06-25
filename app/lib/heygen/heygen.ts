import StreamingAvatar, { TaskMode, TaskType } from "@heygen/streaming-avatar";

export function avatarRepeatAsync(avatar: StreamingAvatar, toRepeat: string) {
    // Post processing
    toRepeat = toRepeat.replaceAll("*", "");

    return avatar
        ?.speak({
            text: toRepeat,
            taskType: TaskType.REPEAT,
            taskMode: TaskMode.ASYNC,
        })
        .catch((error) => {
            console.error("Error while sending async repeat task:", error);
        });
}
