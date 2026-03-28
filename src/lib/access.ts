import { Types } from "mongoose";
import { AuthUser } from "../types/auth";
import { ClassroomModel } from "../modules/classes/classroom.model";
import { SchoolModel } from "../modules/schools/school.model";
import { StudentModel } from "../modules/students/student.model";

export async function canAccessSchool(user: AuthUser, schoolId: string): Promise<boolean> {
  if (user.role === "admin") return true;
  if (!Types.ObjectId.isValid(schoolId)) return false;

  if (user.role === "gestor") {
    if (!user.municipalityCode) return false;
    const school = await SchoolModel.findById(schoolId).select("municipalityCode").lean();
    return Boolean(school && school.municipalityCode === user.municipalityCode);
  }

  if (user.role === "professor" || user.role === "coordenador") {
    return user.schoolId === schoolId;
  }

  return false;
}

export async function canAccessClassroom(user: AuthUser, classroomId: string): Promise<boolean> {
  if (user.role === "admin") return true;
  if (!Types.ObjectId.isValid(classroomId)) return false;

  const classroom = await ClassroomModel.findById(classroomId).select("schoolId").lean();
  if (!classroom) return false;

  if (!(await canAccessSchool(user, String(classroom.schoolId)))) return false;

  if (user.role === "professor") {
    return user.classroomIds.includes(classroomId);
  }

  return true;
}

export async function canAccessStudent(user: AuthUser, studentId: string): Promise<boolean> {
  if (user.role === "admin") return true;
  if (!Types.ObjectId.isValid(studentId)) return false;

  const student = await StudentModel.findById(studentId).select("schoolId classroomId").lean();
  if (!student) return false;

  if (!(await canAccessSchool(user, String(student.schoolId)))) return false;

  if (user.role === "professor") {
    return user.classroomIds.includes(String(student.classroomId));
  }

  return true;
}
