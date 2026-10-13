const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const courseSchema = new Schema({
  title: { type: String, required: true },
  maxStudents: { type: Number, required: true },
  availableSlots: { type: Number, required: true },
  students: [{ type: Schema.Types.ObjectId, ref: "Student" }],
});

const studentSchema = new Schema({
  name: { type: String, required: true },
  courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
});

const Course = mongoose.model("Course", courseSchema);
const Student = mongoose.model("Student", studentSchema);

async function enrollCourse(studentId, courseId) {
  try {
    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId);

    if (!student || !course) {
      console.log("❌ Không tìm thấy Sinh viên hoặc Khóa học!");
      return;
    }

    // 1. Kiểm tra xem sinh viên đã đăng ký khóa học này chưa
    const isEnrolled = student.courses.includes(courseId);
    if (isEnrolled) {
      console.log(
        `⚠️  Sinh viên "${student.name}" đã đăng ký khóa học "${course.title}" rồi.`,
      );
      return;
    }

    // 2. Kiểm tra còn chỗ trống không (availableSlots > 0)
    if (course.availableSlots <= 0) {
      console.log(`⚠️  Khóa học "${course.title}" đã hết chỗ trống!`);
      return;
    }

    // 3. Tiến hành đăng ký: Cập nhật đồng thời cả 2 bảng
    student.courses.push(courseId);
    course.students.push(studentId);
    course.availableSlots -= 1; // Giảm số lượng chỗ còn trống đi 1

    await student.save();
    await course.save();

    console.log(
      `✅ Đăng ký thành công khóa học "${course.title}" cho sinh viên "${student.name}". (Số chỗ còn lại: ${course.availableSlots})`,
    );
  } catch (error) {
    console.error("❌ Lỗi khi đăng ký khóa học:", error.message);
  }
}

/**
 * Yêu cầu 2: Hủy khóa học (dropCourse)
 */
async function dropCourse(studentId, courseId) {
  try {
    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId);

    if (!student || !course) {
      console.log("❌ Không tìm thấy Sinh viên hoặc Khóa học!");
      return;
    }

    // Kiểm tra xem sinh viên có đang học khóa học này không
    const isEnrolled = student.courses.includes(courseId);
    if (!isEnrolled) {
      console.log(
        `⚠️  Sinh viên "${student.name}" chưa đăng ký khóa học "${course.title}".`,
      );
      return;
    }

    // 1. Xóa courseId khỏi danh sách courses của Student
    student.courses = student.courses.filter(
      (id) => id.toString() !== courseId.toString(),
    );

    // 2. Xóa studentId khỏi danh sách students của Course
    course.students = course.students.filter(
      (id) => id.toString() !== studentId.toString(),
    );

    // 3. Hoàn lại 1 slot cho khóa học (availableSlots = availableSlots + 1)
    course.availableSlots += 1;

    await student.save();
    await course.save();

    console.log(
      `✅ Đã hủy khóa học "${course.title}" cho sinh viên "${student.name}". (Số chỗ còn lại: ${course.availableSlots})`,
    );
  } catch (error) {
    console.error("❌ Lỗi khi hủy khóa học:", error.message);
  }
}

async function main() {
  try {
    await mongoose.connect(
      "mongodb+srv://123:123@cluster0.qthujlh.mongodb.net/course_registration?retryWrites=true&w=majority",
    );
    console.log("🔌 Kết nối MongoDB thành công!");

    // Làm sạch cơ sở dữ liệu trước khi test
    await Student.deleteMany({});
    await Course.deleteMany({});

    // Tạo dữ liệu giả lập
    const studentA = await Student.create({ name: "Nguyen Van A" });
    const courseNode = await Course.create({
      title: "Node.js Complete Guide",
      maxStudents: 2,
      availableSlots: 2,
    });

    console.log("\n--- BẮT ĐẦU TEST ---");

    // Test 1: Đăng ký thành công
    await enrollCourse(studentA._id, courseNode._id);

    // Test 2: Thử đăng ký lại khóa học cũ (Sẽ bị báo trùng)
    await enrollCourse(studentA._id, courseNode._id);

    // Test 3: Hủy khóa học
    await dropCourse(studentA._id, courseNode._id);
  } catch (err) {
    console.error("Lỗi kết nối CSDL:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Đã ngắt kết nối CSDL.");
  }
}

main();
