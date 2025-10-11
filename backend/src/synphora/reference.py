from pydantic import BaseModel


class Reference(BaseModel):
    artifactId: str
    title: str


def parse_reference(content: str) -> list[Reference]:
    # TODO mock
    return [
        Reference(
            artifactId="14-dynamic-programming-basics",
            title="14 打家劫舍：动态规划的解题四步骤 ",
        ),
    ]
