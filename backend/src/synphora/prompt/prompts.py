from .renderer import renderer


class AgentPrompts:
    def system(self) -> str:
        return renderer.render("agent-system-prompt.md")

    def user(self, user_message: str) -> str:
        return renderer.render(
            "agent-user-prompt.md",
            user_message=user_message,
        )
