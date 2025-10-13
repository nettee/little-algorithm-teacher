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
        Reference(
            artifactId="15-two-dimensional-dynamic-programming",
            title="15 最长公共子序列：二维动态规划的解法",
        ),
    ]
