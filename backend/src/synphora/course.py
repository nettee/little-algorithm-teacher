from pathlib import Path

from pydantic import BaseModel


class Course(BaseModel):
    artifact_id: str
    slug: str
    title: str
    tags: list[str]
    summary: str

    def to_data(self) -> dict:
        return self.model_dump()


COURSES = [
    Course(
        artifact_id="14-dynamic-programming-basics",
        slug="14-dynamic-programming-basics",
        title="14 打家劫舍：动态规划的解题四步骤",
        tags=["动态规划"],
        summary="动态规划是一类很讲究「触类旁通」的题型。很多动态规划的解法需要你做过某一类型的例题，再做类似的题目的时候就可以想起来相应的思路。动态规划的典型入门题目是打家劫舍问题，本文以打家劫舍问题为例，讲解动态规划的解题四步骤：定义子问题、写出子问题的递推关系、确定 DP 数组的计算顺序、空间优化。",
    ),
]


class CourseManager:
    def __init__(self):
        self.courses_map = {course.artifact_id: course for course in COURSES}

    def list_courses(self) -> list[Course]:
        """列出所有课程"""
        return COURSES

    def get_course(self, artifact_id: str) -> Course:
        """根据 artifact_id 获取课程"""
        if artifact_id not in self.courses_map:
            raise ValueError(f"Course with artifact_id {artifact_id} not found")
        return self.courses_map[artifact_id]

    def read_course_content(self, artifact_id: str) -> str:
        """根据 artifact_id 读取课程内容"""
        course = self.get_course(artifact_id)
        file_path = self._get_course_file_path(course.slug)
        if not file_path.exists():
            raise FileNotFoundError(f"Course file not found: {file_path}")
        with open(file_path, encoding='utf-8') as f:
            content = f.read()
        return content

    @staticmethod
    def _get_course_file_path(slug: str) -> Path:
        return (
            Path(__file__).parent / 'data' / 'leetcode-by-example' / slug / f'{slug}.md'
        )
