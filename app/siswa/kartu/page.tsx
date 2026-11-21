import { requireStudent } from "@/lib/auth";
import { StudentCardManager } from "@/components/student-card-manager";

export default async function StudentCardPage() {
  const { student } = await requireStudent();

  return (
    <StudentCardManager
      initial={{
        cardUid: student.cardUid,
        status: student.cardStatus,
        blockReason: student.cardBlockReason,
        hasPin: Boolean(student.cardPinHash),
        pinAttempts: student.pinAttempts,
      }}
    />
  );
}
