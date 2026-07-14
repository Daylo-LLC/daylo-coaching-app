import * as Calendar from "expo-calendar";
import { Platform, Alert } from "react-native";

interface GameEvent {
  title: string;
  date: string;
  timeStart: string;
  timeEnd?: string | null;
  venue?: string | null;
  sport: string;
  notes?: string;
  opponentSchool?: string | null;
  url?: string;
}

async function getOrCreateCalendar(): Promise<string | null> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission Denied",
      "Calendar access is needed to export games.",
    );
    return null;
  }

  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );

  const dayloCalendar = calendars.find((c) => c.title === "Daylo Games");
  if (dayloCalendar) return dayloCalendar.id;

  if (Platform.OS === "ios") {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    const newId = await Calendar.createCalendarAsync({
      title: "Daylo Games",
      color: "#F97316",
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendar.source.id,
      source: defaultCalendar.source,
      name: "Daylo Games",
      ownerAccount: "personal",
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    return newId;
  } else {
    const sources = calendars.filter(
      (c) => c.source?.isLocalAccount || c.source?.name === "Default",
    );
    const source =
      sources.length > 0 ? sources[0].source : calendars[0]?.source;
    if (!source) return null;

    const newId = await Calendar.createCalendarAsync({
      title: "Daylo Games",
      color: "#F97316",
      entityType: Calendar.EntityTypes.EVENT,
      source,
      name: "Daylo Games",
      ownerAccount: "personal",
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    return newId;
  }
}

function parseDateTime(date: string, time: string): Date {
  // Parse date as local time to avoid UTC shifting it to the previous day
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export async function exportGameToCalendar(game: GameEvent): Promise<boolean> {
  try {
    const calendarId = await getOrCreateCalendar();
    if (!calendarId) return false;

    const startDate = parseDateTime(game.date, game.timeStart);
    const endDate = game.timeEnd
      ? parseDateTime(game.date, game.timeEnd)
      : new Date(startDate.getTime() + 60 * 60 * 1000);

    const sportLabel = game.sport.charAt(0).toUpperCase() + game.sport.slice(1);
    const title = game.opponentSchool
      ? `${sportLabel} vs. ${game.opponentSchool}`
      : `${sportLabel} Game — ${game.title}`;

    await Calendar.createEventAsync(calendarId, {
      title,
      startDate,
      endDate,
      location: game.venue || undefined,
      notes: game.notes || `Daylo scheduled game`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      alarms: [{ relativeOffset: -60 }, { relativeOffset: -1440 }],
      url: game.url,
    });

    Alert.alert(
      "Exported",
      "Game has been added to your Daylo Games calendar.",
    );
    return true;
  } catch (error) {
    console.error("Calendar export error:", error);
    Alert.alert("Error", "Failed to export game to calendar.");
    return false;
  }
}

export async function exportMultipleGames(games: GameEvent[]): Promise<number> {
  const calendarId = await getOrCreateCalendar();
  if (!calendarId) return 0;

  let count = 0;
  for (const game of games) {
    try {
      const startDate = parseDateTime(game.date, game.timeStart);
      const endDate = game.timeEnd
        ? parseDateTime(game.date, game.timeEnd)
        : new Date(startDate.getTime() + 60 * 60 * 1000);

      const sportLabel =
        game.sport.charAt(0).toUpperCase() + game.sport.slice(1);
      const title = game.opponentSchool
        ? `${sportLabel} vs. ${game.opponentSchool}`
        : `${sportLabel} Game — ${game.title}`;

      await Calendar.createEventAsync(calendarId, {
        title,
        startDate,
        endDate,
        location: game.venue || undefined,
        notes: game.notes || `Daylo scheduled game`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        alarms: [{ relativeOffset: -60 }, { relativeOffset: -1440 }],
        url: game.url,
      });
      count++;
    } catch (error) {
      console.error("Failed to export game:", error);
    }
  }

  Alert.alert(
    "Exported",
    `${count} game${count !== 1 ? "s" : ""} added to your calendar.`,
  );
  return count;
}
